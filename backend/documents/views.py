import re
from django.db import transaction

from rest_framework import generics, permissions, status as http_status
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import HealthDocument, DocumentAnalysis, ExtractedTestResult

from .serializers import (
    HealthDocumentSerializer,
    HealthDocumentListSerializer,
    DocumentAnalysisSerializer,
    TimelineSerializer,
)

from .pdf_utils import extract_text_from_pdf, PDFExtractionError

from ai.gemini_service import (
    analyze_document_text,
    analyze_document_pdf,
    GeminiServiceError,
    ask_about_report,
)


class DocumentUploadView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HealthDocumentSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DocumentListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HealthDocumentListSerializer

    def get_queryset(self):
        return HealthDocument.objects.filter(
            user=self.request.user
        ).order_by('-uploaded_at')


class DocumentDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = HealthDocumentSerializer

    def get_queryset(self):
        return HealthDocument.objects.filter(
            user=self.request.user
        )


def calculate_status(value_str, ref_low, ref_high):
    """Backend is the source of truth for LOW/NORMAL/HIGH."""
    if ref_low is None or ref_high is None:
        return 'UNKNOWN'

    try:
        value = float(value_str)
    except (TypeError, ValueError):
        return 'UNKNOWN'

    if value < ref_low:
        return 'LOW'

    if value > ref_high:
        return 'HIGH'

    return 'NORMAL'


def _parse_number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _build_local_fallback_analysis(text):
    """
    Safe fallback for readable PDFs when Gemini is temporarily unavailable.

    It extracts obvious laboratory rows from the already-read PDF text.
    It does not invent an AI diagnosis or claim that Gemini analyzed the file.
    """
    test_results = []

    ignored_names = {
        'patient name',
        'name',
        'age',
        'date',
        'gender',
        'sex',
        'doctor',
        'doctor name',
        'patient id',
        'report id',
        'phone',
        'mobile',
        'address',
        'impression',
    }

    pattern_with_reference = re.compile(
        r"""
        ^\s*
        (?P<name>[^:\n]{2,100})
        \s*:\s*
        (?P<value>-?\d+(?:\.\d+)?)
        \s*
        (?P<unit>[^ (\n]*?(?:\s*[^ (\n]+)?)?)
        \s*
        \(
        \s*
        (?:normal|reference|ref)
        \s*:\s*
        (?P<low>-?\d+(?:\.\d+)?)
        \s*[-–—]\s*
        (?P<high>-?\d+(?:\.\d+)?)
        \s*
        (?P<ref_unit>[^)]*)
        \)
        \s*$
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    pattern_simple = re.compile(
        r"""
        ^\s*
        (?P<name>[^:\n]{2,100})
        \s*:\s*
        (?P<value>-?\d+(?:\.\d+)?)
        \s*
        (?P<unit>[A-Za-zµμ/%][A-Za-z0-9µμ/%.^_-]*)
        \s*$
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    for raw_line in text.splitlines():
        line = raw_line.strip()

        if not line:
            continue

        match = pattern_with_reference.match(line)

        if match:
            name = match.group('name').strip()

            if name.lower() in ignored_names:
                continue

            value = match.group('value').strip()
            unit = match.group('unit').strip()
            low = _parse_number(match.group('low'))
            high = _parse_number(match.group('high'))
            reference_unit = match.group('ref_unit').strip()

            reference_range = (
                f"{match.group('low')}-{match.group('high')}"
            )

            if reference_unit:
                reference_range += f" {reference_unit}"

            test_results.append({
                'test_name': name,
                'value': value,
                'unit': unit,
                'reference_range': reference_range,
                'reference_low': low,
                'reference_high': high,
                'status': calculate_status(value, low, high),
                'explanation': (
                    f"{name} is a laboratory measurement reported in "
                    "the uploaded document. Professional interpretation "
                    "should be obtained from a qualified healthcare professional."
                ),
            })

            continue

        match = pattern_simple.match(line)

        if match:
            name = match.group('name').strip()

            if name.lower() in ignored_names:
                continue

            value = match.group('value').strip()
            unit = match.group('unit').strip()

            test_results.append({
                'test_name': name,
                'value': value,
                'unit': unit,
                'reference_range': '',
                'reference_low': None,
                'reference_high': None,
                'status': 'UNKNOWN',
                'explanation': (
                    f"{name} is a reported value extracted directly "
                    "from the readable PDF text."
                ),
            })

    abnormal_names = [
        item['test_name']
        for item in test_results
        if item['status'] in ('LOW', 'HIGH')
    ]

    return {
        'document_summary': (
            "Gemini AI is temporarily unavailable, so HealthMate used "
            "its local readable-PDF fallback. The numeric results below "
            "were extracted directly from the uploaded report. No diagnosis "
            "or treatment decision was generated by this fallback."
        ),
        'key_observations': [
            f"{len(test_results)} readable test value(s) were extracted "
            "from the report."
        ] if test_results else [],
        'test_results': test_results,
        'simple_explanations': [
            "AI analysis was temporarily unavailable.",
            "The displayed values were extracted directly from the uploaded PDF.",
        ],
        'doctor_questions': [
            "Could you please explain these reported values in the "
            "context of my health?"
        ],
        'disclaimer': (
            "This fallback provides extracted report information only "
            "and is not a substitute for professional medical advice."
        ),
        '_fallback_used': True,
        '_fallback_reason': "Gemini service temporarily unavailable.",
    }


def _safe_string(value, max_length):
    """Convert a value to a bounded string for CharField safety."""
    if value is None:
        return ''
    return str(value).strip()[:max_length]


def _safe_string_list(value, item_limit=30, item_length=500):
    """Keep JSON-list content simple, bounded and serializable."""
    if not isinstance(value, list):
        return []

    cleaned = []

    for item in value[:item_limit]:
        if isinstance(item, (str, int, float, bool)):
            cleaned.append(str(item)[:item_length])

    return cleaned


def _normalize_and_save_analysis(document, ai_result):
    """
    Normalize Gemini/local-fallback output and save it safely.

    Database-facing strings are bounded to the actual model field sizes.
    """

    summary = _safe_string(
        ai_result.get('document_summary', ''),
        30000,
    )

    key_observations = _safe_string_list(
        ai_result.get('key_observations', []),
        item_limit=30,
        item_length=1000,
    )

    simple_explanations = _safe_string_list(
        ai_result.get('simple_explanations', []),
        item_limit=30,
        item_length=1000,
    )

    doctor_questions = _safe_string_list(
        ai_result.get('doctor_questions', []),
        item_limit=30,
        item_length=1000,
    )

    test_results = ai_result.get('test_results', []) or []

    processed_results = []
    abnormal_names = []

    for item in test_results[:100]:

        if not isinstance(item, dict):
            continue

        ref_low = _parse_number(item.get('reference_low'))
        ref_high = _parse_number(item.get('reference_high'))

        value_str = _safe_string(
            item.get('value', ''),
            50,
        )

        test_name = _safe_string(
            item.get('test_name', ''),
            150,
        ) or 'Unknown Test'

        unit = _safe_string(
            item.get('unit', ''),
            30,
        )

        reference_range = _safe_string(
            item.get('reference_range', ''),
            100,
        )

        explanation = _safe_string(
            item.get('explanation', ''),
            5000,
        )

        calculated_status = calculate_status(
            value_str,
            ref_low,
            ref_high,
        )

        if calculated_status in ('LOW', 'HIGH'):
            abnormal_names.append(test_name)

        processed_results.append({
            'test_name': test_name,
            'value': value_str,
            'unit': unit,
            'reference_range': reference_range,
            'reference_low': ref_low,
            'reference_high': ref_high,
            'status': calculated_status,
            'explanation': explanation,
        })

    safe_raw_response = {
        'document_summary': summary,
        'key_observations': key_observations,
        'simple_explanations': simple_explanations,
        'doctor_questions': doctor_questions,
        'test_results': processed_results,
    }

    with transaction.atomic():

        analysis, _ = DocumentAnalysis.objects.update_or_create(
            document=document,
            defaults={
                'summary': summary,
                'key_observations': key_observations,
                'abnormal_values': _safe_string_list(
                    abnormal_names,
                    item_limit=100,
                    item_length=150,
                ),
                'simple_explanations': simple_explanations,
                'doctor_questions': doctor_questions,
                'raw_ai_response': safe_raw_response,
            },
        )

        analysis.test_results.all().delete()

        for item in processed_results:
            ExtractedTestResult.objects.create(
                analysis=analysis,
                test_name=item['test_name'],
                value=item['value'],
                unit=item['unit'],
                reference_range=item['reference_range'],
                reference_low=item['reference_low'],
                reference_high=item['reference_high'],
                status=item['status'],
                explanation=item['explanation'],
            )

        document.analysis_status = 'ANALYZED'
        document.save(update_fields=['analysis_status'])

    return analysis


def _save_minimal_fallback_analysis(document, original_text):
    """
    Last-resort fallback that does not depend on Gemini and does not
    create individual test rows. It keeps the report in ANALYZED state
    so the user can still open the analysis page.
    """

    summary = (
        'Gemini AI is temporarily unavailable. HealthMate successfully '
        'read the uploaded PDF, but the AI interpretation service could '
        'not be reached at this moment. Please use the original report '
        'and a qualified healthcare professional for medical interpretation.'
    )

    observations = [
        'The PDF was uploaded and its readable text was extracted successfully.'
    ]

    if original_text and original_text.strip():
        observations.append(
            f'Extracted report text length: {len(original_text)} characters.'
        )

    with transaction.atomic():

        analysis, _ = DocumentAnalysis.objects.update_or_create(
            document=document,
            defaults={
                'summary': summary,
                'key_observations': observations,
                'abnormal_values': [],
                'simple_explanations': [
                    'AI interpretation is temporarily unavailable.'
                ],
                'doctor_questions': [
                    'Please discuss the report with a qualified healthcare professional.'
                ],
                'raw_ai_response': {
                    'source': 'local_fallback',
                    'ai_unavailable': True,
                },
            },
        )

        analysis.test_results.all().delete()

        document.analysis_status = 'ANALYZED'
        document.save(update_fields=['analysis_status'])

    return analysis


class DocumentAnalyzeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            document = HealthDocument.objects.get(
                pk=pk,
                user=request.user,
            )
        except HealthDocument.DoesNotExist:
            return Response(
                {'detail': 'Document not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        document.analysis_status = 'PROCESSING'
        document.save(update_fields=['analysis_status'])

        # 1. Try normal text extraction.
        try:
            text = extract_text_from_pdf(
                document.file.path
            )

            if not text or not text.strip():
                raise PDFExtractionError(
                    'No readable text found in the PDF.'
                )

        except PDFExtractionError:
            # 2. Scanned/image-based PDF fallback through Gemini.
            try:
                ai_result = analyze_document_pdf(
                    document.file.path
                )

                document.extracted_text = (
                    '[Scanned PDF analyzed directly by Gemini]'
                )
                document.save(update_fields=['extracted_text'])

                analysis = _normalize_and_save_analysis(
                    document,
                    ai_result,
                )

                return Response({
                    'detail': 'Scanned PDF analyzed successfully.',
                    'analysis_id': analysis.id,
                })

            except GeminiServiceError:
                document.analysis_status = 'FAILED'
                document.save(update_fields=['analysis_status'])

                return Response(
                    {
                        'detail': (
                            'This PDF appears to be scanned/image-based '
                            'and Gemini is temporarily unavailable. '
                            'Please try this report again shortly.'
                        )
                    },
                    status=http_status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            except Exception as error:
                document.analysis_status = 'FAILED'
                document.save(update_fields=['analysis_status'])

                return Response(
                    {
                        'detail': f'Scanned PDF analysis failed: {error}'
                    },
                    status=http_status.HTTP_502_BAD_GATEWAY,
                )

        # 3. Save extracted text for a normal PDF.
        document.extracted_text = text
        document.save(update_fields=['extracted_text'])

        # 4. Try Gemini first.
        try:
            ai_result = analyze_document_text(text)
            used_fallback = False

        except GeminiServiceError as error:
            print(
                f'Gemini unavailable; using local report fallback: {error}'
            )
            ai_result = _build_local_fallback_analysis(text)
            used_fallback = True

        except Exception as error:
            print(
                f'Unexpected Gemini error; using local report fallback: {error}'
            )
            ai_result = _build_local_fallback_analysis(text)
            used_fallback = True

        # 5. Save the result. If the detailed local fallback contains data
        # that cannot fit the database schema, save one minimal safe analysis
        # instead of returning HTTP 500.
        try:
            analysis = _normalize_and_save_analysis(
                document,
                ai_result,
            )

        except Exception as error:
            print(
                f'Fallback/analysis save error: {error}'
            )

            try:
                analysis = _save_minimal_fallback_analysis(
                    document,
                    text,
                )
                used_fallback = True

            except Exception as final_error:
                print(
                    f'Minimal fallback save also failed: {final_error}'
                )

                document.analysis_status = 'FAILED'
                document.save(update_fields=['analysis_status'])

                return Response(
                    {
                        'detail': (
                            'Report could not be processed because the temporary '
                            'AI service is unavailable and the report could not be saved.'
                        )
                    },
                    status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        return Response({
            'detail': (
                'Report analyzed successfully.'
                if not used_fallback
                else
                'Report processed successfully. Gemini was temporarily '
                'unavailable, so HealthMate used its local report fallback.'
            ),
            'analysis_id': analysis.id,
            'used_fallback': used_fallback,
        })


class DocumentAnalysisDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DocumentAnalysisSerializer

    def get_object(self):
        document = HealthDocument.objects.get(
            pk=self.kwargs['pk'],
            user=self.request.user,
        )
        return document.analysis


class HealthTimelineView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TimelineSerializer

    def get_queryset(self):
        return None

    def list(self, request, *args, **kwargs):
        documents = HealthDocument.objects.filter(
            user=request.user
        ).order_by('-uploaded_at')

        timeline_data = []

        for doc in documents:
            total_parameters = 0
            outside_range_count = 0

            try:
                analysis = doc.analysis
                total_parameters = analysis.test_results.count()
                outside_range_count = (
                    analysis.test_results
                    .filter(status__in=['LOW', 'HIGH'])
                    .count()
                )
            except DocumentAnalysis.DoesNotExist:
                pass

            timeline_data.append({
                'id': doc.id,
                'title': doc.title,
                'document_type': doc.document_type,
                'uploaded_at': doc.uploaded_at,
                'analysis_status': doc.analysis_status,
                'total_parameters': total_parameters,
                'outside_range_count': outside_range_count,
            })

        serializer = self.get_serializer(
            timeline_data,
            many=True,
        )

        return Response(serializer.data)


class CompareReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        doc1_id = request.query_params.get('doc1')
        doc2_id = request.query_params.get('doc2')

        if not doc1_id or not doc2_id:
            return Response(
                {
                    'detail': (
                        'Please provide both doc1 and doc2 query parameters.'
                    )
                },
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        try:
            doc1 = HealthDocument.objects.get(
                pk=doc1_id,
                user=request.user,
            )
            doc2 = HealthDocument.objects.get(
                pk=doc2_id,
                user=request.user,
            )
        except HealthDocument.DoesNotExist:
            return Response(
                {'detail': 'One or both documents were not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        if doc1.uploaded_at > doc2.uploaded_at:
            doc1, doc2 = doc2, doc1

        try:
            analysis1 = doc1.analysis
            analysis2 = doc2.analysis
        except DocumentAnalysis.DoesNotExist:
            return Response(
                {
                    'detail': (
                        'Both documents must be analyzed before they can be compared.'
                    )
                },
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        results1 = {
            r.test_name.strip().lower(): r
            for r in analysis1.test_results.all()
        }
        results2 = {
            r.test_name.strip().lower(): r
            for r in analysis2.test_results.all()
        }

        common_test_names = set(results1.keys()) & set(results2.keys())
        comparisons = []

        for name in common_test_names:
            r1 = results1[name]
            r2 = results2[name]

            if (
                (r1.unit or '').strip().lower()
                != (r2.unit or '').strip().lower()
            ):
                continue

            try:
                v1 = float(r1.value)
                v2 = float(r2.value)
            except (TypeError, ValueError):
                continue

            absolute_change = round(v2 - v1, 2)

            percentage_change = None
            if v1 != 0:
                percentage_change = round(
                    (v2 - v1) / v1 * 100,
                    1,
                )

            comparisons.append({
                'test_name': r1.test_name,
                'unit': r1.unit,
                'previous_value': v1,
                'latest_value': v2,
                'absolute_change': absolute_change,
                'percentage_change': percentage_change,
                'previous_status': r1.status,
                'latest_status': r2.status,
            })

        comparisons.sort(key=lambda c: c['test_name'])

        return Response({
            'previous_report': {
                'id': doc1.id,
                'title': doc1.title,
                'uploaded_at': doc1.uploaded_at,
            },
            'latest_report': {
                'id': doc2.id,
                'title': doc2.title,
                'uploaded_at': doc2.uploaded_at,
            },
            'comparisons': comparisons,
        })


# ============================================================
# LOCAL CHAT FALLBACK
# ============================================================


def _local_report_chat_answer(report_context, question):
    """
    Safe fallback when Gemini chat is temporarily unavailable.
    Answers only from already stored report data.
    """
    q = (question or '').strip().lower()

    summary = report_context.get('summary', '') or ''
    test_results = report_context.get('test_results', []) or []

    # Specific test question.
    for result in test_results:
        test_name = str(
            result.get('test_name', '')
        ).strip()

        if not test_name:
            continue

        if test_name.lower() in q:
            value = result.get('value', '')
            unit = result.get('unit', '')
            reference = result.get('reference_range', '')
            result_status = result.get('status', 'UNKNOWN')

            answer = (
                f'According to your uploaded report, '
                f'{test_name} is {value}'
            )

            if unit:
                answer += f' {unit}'

            answer += '.'

            if reference:
                answer += (
                    f' The reported reference range is {reference}.'
                )

            answer += (
                f' The application status is {result_status}.'
            )

            if result_status == 'LOW':
                answer += (
                    ' The reported value is below the reference range shown in the report.'
                )
            elif result_status == 'HIGH':
                answer += (
                    ' The reported value is above the reference range shown in the report.'
                )
            elif result_status == 'NORMAL':
                answer += (
                    ' The reported value falls within the reference range shown in the report.'
                )

            answer += (
                ' This is report information only and is not a medical diagnosis.'
            )

            return answer

    # Summary questions.
    if any(word in q for word in [
        'summary',
        'summarize',
        'report about',
        'what does my report say',
        'explain my report',
    ]):
        if summary:
            return (
                'According to your stored report analysis:\n\n'
                f'{summary}'
            )

        return 'A report summary is not available in the stored analysis.'

    # Abnormal/high/low questions.
    if any(word in q for word in [
        'abnormal',
        'outside range',
        'out of range',
    ]):
        abnormal = []

        for result in test_results:
            result_status = str(
                result.get('status', '')
            ).upper()

            if result_status in ('LOW', 'HIGH'):
                name = result.get('test_name', 'Unknown test')
                value = result.get('value', '')
                unit = result.get('unit', '')

                item = f'{name}: {value}'
                if unit:
                    item += f' {unit}'
                item += f' ({result_status})'

                abnormal.append(item)

        if abnormal:
            return (
                'The following stored report values are marked outside '
                'their reported reference ranges:\n\n'
                + '\n'.join(f'• {item}' for item in abnormal)
                + '\n\nThis is only a report-based status, not a diagnosis.'
            )

        return (
            'No stored test result is currently marked LOW or HIGH in this report.'
        )

    # All values/questions.
    if any(word in q for word in [
        'all tests',
        'all values',
        'test values',
        'show tests',
        'show values',
    ]):
        if test_results:
            lines = []

            for result in test_results:
                name = result.get('test_name', 'Unknown test')
                value = result.get('value', '')
                unit = result.get('unit', '')
                result_status = result.get('status', 'UNKNOWN')

                line = f'{name}: {value}'
                if unit:
                    line += f' {unit}'
                line += f' — {result_status}'
                lines.append(line)

            return (
                'Here are the test values stored from your report:\n\n'
                + '\n'.join(f'• {line}' for line in lines)
            )

    # Generic safe fallback.
    if test_results:
        lines = []

        for result in test_results[:8]:
            name = result.get('test_name', 'Unknown test')
            value = result.get('value', '')
            unit = result.get('unit', '')

            line = f'{name}: {value}'
            if unit:
                line += f' {unit}'
            lines.append(line)

        return (
            'Gemini is temporarily unavailable, but I can still show '
            'information already stored from your report.\n\n'
            + '\n'.join(f'• {line}' for line in lines)
            + '\n\nAsk me about a specific test name to see its stored value '
              'and reference range.'
        )

    return (
        'Gemini is temporarily unavailable and there is not enough '
        'stored report information to answer this question.'
    )


class ReportChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        question = request.data.get('question', '').strip()

        if not question:
            return Response(
                {'detail': 'Please provide a question.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = HealthDocument.objects.get(
                pk=pk,
                user=request.user,
            )

            analysis = document.analysis

        except (
            HealthDocument.DoesNotExist,
            DocumentAnalysis.DoesNotExist,
        ):
            return Response(
                {'detail': 'Analyzed report not found.'},
                status=http_status.HTTP_404_NOT_FOUND,
            )

        context = {
            'report_title': document.title,
            'summary': analysis.summary,
            'test_results': [
                {
                    'test_name': r.test_name,
                    'value': r.value,
                    'unit': r.unit,
                    'reference_range': r.reference_range,
                    'status': r.status,
                }
                for r in analysis.test_results.all()
            ],
        }

        # Gemini first.
        try:
            answer = ask_about_report(
                context,
                question,
            )

            return Response({
                'answer': answer,
                'used_fallback': False,
            })

        # Gemini 503/429/unavailable: answer from stored report data.
        except GeminiServiceError as error:
            print(
                f'Gemini chat unavailable; using local fallback: {error}'
            )

            fallback_answer = _local_report_chat_answer(
                context,
                question,
            )

            return Response({
                'answer': fallback_answer,
                'used_fallback': True,
            })

        except Exception as error:
            print(
                f'Unexpected Gemini chat error; using local fallback: {error}'
            )

            fallback_answer = _local_report_chat_answer(
                context,
                question,
            )

            return Response({
                'answer': fallback_answer,
                'used_fallback': True,
            })
