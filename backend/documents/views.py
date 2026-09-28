import re

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
    """
    Backend is the source of truth for NORMAL/LOW/HIGH.
    """

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
    Safe fallback for readable PDFs when Gemini is temporarily
    unavailable.

    This does NOT pretend to be AI.
    It extracts obvious numeric test rows directly from
    the PDF text.
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

    # Example:
    # TSH: 5.8 µIU/mL (Normal: 0.4–4.0 µIU/mL)
    pattern_with_reference = re.compile(
        r"""
        ^\s*
        (?P<name>[^:\n]{2,100})
        \s*:\s*
        (?P<value>-?\d+(?:\.\d+)?)
        \s*
        (?P<unit>[^(\n]*?)
        \s*
        \(
        \s*
        (?:normal|reference|ref)
        \s*:\s*
        (?P<low>-?\d+(?:\.\d+)?)
        \s*
        [\-–—]
        \s*
        (?P<high>-?\d+(?:\.\d+)?)
        \s*
        (?P<ref_unit>[^)]*)
        \)
        \s*$
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    # Example:
    # Hemoglobin: 12.5 g/dL
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

            low = _parse_number(
                match.group('low')
            )

            high = _parse_number(
                match.group('high')
            )

            reference_unit = (
                match.group('ref_unit').strip()
            )

            reference_range = (
                f"{match.group('low')}"
                f"-"
                f"{match.group('high')}"
            )

            if reference_unit:
                reference_range += (
                    f" {reference_unit}"
                )

            value_status = calculate_status(
                value,
                low,
                high
            )

            test_results.append({
                'test_name': name,
                'value': value,
                'unit': unit,
                'reference_range': reference_range,
                'reference_low': low,
                'reference_high': high,
                'status': value_status,
                'explanation':
                    f"{name} is a reported laboratory "
                    f"measurement. Please use the original "
                    f"report and a qualified healthcare "
                    f"professional for interpretation.",
            })

            continue

        match = pattern_simple.match(line)

        if match:

            name = match.group('name').strip()

            if name.lower() in ignored_names:
                continue

            # Avoid demographic lines such as "Age: 32"
            if name.lower() == 'age':
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
                'explanation':
                    f"{name} is a reported value extracted "
                    f"directly from the readable PDF text.",
            })

    abnormal_names = [
        item['test_name']
        for item in test_results
        if item['status'] in ('LOW', 'HIGH')
    ]

    if test_results:

        summary = (
            "Gemini AI is temporarily unavailable, so "
            "HealthMate used its local readable-PDF fallback. "
            "The numeric results below were extracted directly "
            "from the uploaded report. No diagnosis or treatment "
            "decision was generated by this fallback."
        )

        observations = [
            f"{len(test_results)} readable test value(s) "
            "were extracted from the report."
        ]

    else:

        summary = (
            "The PDF text was readable, but no structured "
            "laboratory test rows could be extracted by the "
            "local fallback while Gemini was unavailable."
        )

        observations = []

    return {
        'document_summary': summary,
        'key_observations': observations,
        'test_results': test_results,
        'simple_explanations': [
            "AI analysis was temporarily unavailable.",
            "The displayed values were extracted directly "
            "from the uploaded PDF.",
        ],
        'doctor_questions': [
            "Could you please explain these reported values "
            "in the context of my health?",
        ],
        'disclaimer':
            "This fallback provides extracted report information "
            "only and is not a substitute for professional "
            "medical advice.",
        '_fallback_used': True,
        '_fallback_reason':
            "Gemini service temporarily unavailable.",
    }


def _normalize_and_save_analysis(
    document,
    ai_result
):
    summary = ai_result.get(
        'document_summary',
        ''
    ) or ''

    key_observations = ai_result.get(
        'key_observations',
        []
    ) or []

    simple_explanations = ai_result.get(
        'simple_explanations',
        []
    ) or []

    doctor_questions = ai_result.get(
        'doctor_questions',
        []
    ) or []

    test_results = ai_result.get(
        'test_results',
        []
    ) or []

    processed_results = []
    abnormal_names = []

    for item in test_results:

        if not isinstance(item, dict):
            continue

        ref_low = _parse_number(
            item.get('reference_low')
        )

        ref_high = _parse_number(
            item.get('reference_high')
        )

        value_str = (
            item.get('value', '')
            or ''
        )

        test_name = (
            item.get('test_name', '')
            or 'Unknown Test'
        )

        calculated_status = calculate_status(
            value_str,
            ref_low,
            ref_high
        )

        if calculated_status in ('LOW', 'HIGH'):
            abnormal_names.append(
                test_name
            )

        processed_results.append({
            'test_name': test_name,

            'value': value_str,

            'unit': (
                item.get('unit', '')
                or ''
            ),

            'reference_range': (
                item.get(
                    'reference_range',
                    ''
                )
                or ''
            ),

            'reference_low': ref_low,

            'reference_high': ref_high,

            'status': calculated_status,

            'explanation': (
                item.get('explanation', '')
                or ''
            ),
        })

    analysis, _ = DocumentAnalysis.objects.update_or_create(
        document=document,
        defaults={
            'summary': summary,
            'key_observations': key_observations,
            'abnormal_values': abnormal_names,
            'simple_explanations': simple_explanations,
            'doctor_questions': doctor_questions,
            'raw_ai_response': ai_result,
        }
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

    document.save(
        update_fields=['analysis_status']
    )

    return analysis


class DocumentAnalyzeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):

        try:

            document = HealthDocument.objects.get(
                pk=pk,
                user=request.user
            )

        except HealthDocument.DoesNotExist:

            return Response(
                {
                    "detail":
                    "Document not found."
                },
                status=http_status.HTTP_404_NOT_FOUND
            )

        document.analysis_status = 'PROCESSING'

        document.save(
            update_fields=['analysis_status']
        )

        # ==================================================
        # STEP 1: READ PDF TEXT
        # ==================================================

        try:

            text = extract_text_from_pdf(
                document.file.path
            )

            if not text or not text.strip():

                raise PDFExtractionError(
                    "No readable text found in the PDF."
                )

        except PDFExtractionError:

            # ==================================================
            # SCANNED PDF
            # ==================================================

            try:

                ai_result = analyze_document_pdf(
                    document.file.path
                )

                document.extracted_text = (
                    "[Scanned PDF analyzed directly by Gemini]"
                )

                document.save(
                    update_fields=['extracted_text']
                )

                analysis = (
                    _normalize_and_save_analysis(
                        document,
                        ai_result
                    )
                )

                return Response({
                    "detail":
                    "Scanned PDF analyzed successfully.",

                    "analysis_id":
                    analysis.id,
                })

            except GeminiServiceError as error:

                document.analysis_status = 'FAILED'

                document.save(
                    update_fields=['analysis_status']
                )

                return Response(
                    {
                        "detail":
                        "This PDF appears to be scanned/image-based "
                        "and Gemini is temporarily unavailable. "
                        "Please try this report again shortly."
                    },
                    status=http_status.HTTP_503_SERVICE_UNAVAILABLE
                )

            except Exception as error:

                document.analysis_status = 'FAILED'

                document.save(
                    update_fields=['analysis_status']
                )

                return Response(
                    {
                        "detail":
                        f"Scanned PDF analysis failed: {error}"
                    },
                    status=http_status.HTTP_502_BAD_GATEWAY
                )

        # ==================================================
        # STEP 2: SAVE EXTRACTED TEXT
        # ==================================================

        document.extracted_text = text

        document.save(
            update_fields=['extracted_text']
        )

        # ==================================================
        # STEP 3: TRY GEMINI
        # ==================================================

        try:

            ai_result = analyze_document_text(
                text
            )

            used_fallback = False

        except GeminiServiceError as error:

            print(
                "Gemini unavailable. "
                "Using local readable-PDF fallback."
            )

            ai_result = _build_local_fallback_analysis(
                text
            )

            used_fallback = True

        except Exception as error:

            print(
                f"Unexpected Gemini error: {error}"
            )

            ai_result = _build_local_fallback_analysis(
                text
            )

            used_fallback = True

        # ==================================================
        # STEP 4: SAVE ANALYSIS
        # ==================================================

        try:

            analysis = _normalize_and_save_analysis(
                document,
                ai_result
            )

        except Exception as error:

            document.analysis_status = 'FAILED'

            document.save(
                update_fields=['analysis_status']
            )

            return Response(
                {
                    "detail":
                    f"Could not save report analysis: {error}"
                },
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({

            "detail":
            (
                "Report analyzed successfully."
                if not used_fallback
                else
                "Report processed successfully. "
                "Gemini was temporarily unavailable, "
                "so readable report values were extracted locally."
            ),

            "analysis_id":
            analysis.id,

            "used_fallback":
            used_fallback,

        })


class DocumentAnalysisDetailView(
    generics.RetrieveAPIView
):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    serializer_class = DocumentAnalysisSerializer

    def get_object(self):

        document = HealthDocument.objects.get(
            pk=self.kwargs['pk'],
            user=self.request.user
        )

        return document.analysis


class HealthTimelineView(
    generics.ListAPIView
):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    serializer_class = TimelineSerializer

    def get_queryset(self):
        return None

    def list(
        self,
        request,
        *args,
        **kwargs
    ):

        documents = HealthDocument.objects.filter(
            user=request.user
        ).order_by('-uploaded_at')

        timeline_data = []

        for doc in documents:

            total_parameters = 0
            outside_range_count = 0

            try:

                analysis = doc.analysis

                total_parameters = (
                    analysis.test_results.count()
                )

                outside_range_count = (
                    analysis.test_results
                    .filter(
                        status__in=[
                            'LOW',
                            'HIGH'
                        ]
                    )
                    .count()
                )

            except DocumentAnalysis.DoesNotExist:

                pass

            timeline_data.append({

                'id':
                doc.id,

                'title':
                doc.title,

                'document_type':
                doc.document_type,

                'uploaded_at':
                doc.uploaded_at,

                'analysis_status':
                doc.analysis_status,

                'total_parameters':
                total_parameters,

                'outside_range_count':
                outside_range_count,

            })

        serializer = self.get_serializer(
            timeline_data,
            many=True
        )

        return Response(
            serializer.data
        )


class CompareReportsView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get(self, request):

        doc1_id = request.query_params.get(
            'doc1'
        )

        doc2_id = request.query_params.get(
            'doc2'
        )

        if not doc1_id or not doc2_id:

            return Response(
                {
                    "detail":
                    "Please provide both doc1 and doc2 query parameters."
                },
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:

            doc1 = HealthDocument.objects.get(
                pk=doc1_id,
                user=request.user
            )

            doc2 = HealthDocument.objects.get(
                pk=doc2_id,
                user=request.user
            )

        except HealthDocument.DoesNotExist:

            return Response(
                {
                    "detail":
                    "One or both documents were not found."
                },
                status=http_status.HTTP_404_NOT_FOUND
            )

        if doc1.uploaded_at > doc2.uploaded_at:

            doc1, doc2 = doc2, doc1

        try:

            analysis1 = doc1.analysis
            analysis2 = doc2.analysis

        except DocumentAnalysis.DoesNotExist:

            return Response(
                {
                    "detail":
                    "Both documents must be analyzed before they can be compared."
                },
                status=http_status.HTTP_400_BAD_REQUEST
            )

        results1 = {
            r.test_name.strip().lower(): r
            for r in analysis1.test_results.all()
        }

        results2 = {
            r.test_name.strip().lower(): r
            for r in analysis2.test_results.all()
        }

        common_test_names = (
            set(results1.keys())
            &
            set(results2.keys())
        )

        comparisons = []

        for name in common_test_names:

            r1 = results1[name]
            r2 = results2[name]

            if (
                (r1.unit or '').strip().lower()
                !=
                (r2.unit or '').strip().lower()
            ):
                continue

            try:

                v1 = float(r1.value)
                v2 = float(r2.value)

            except (TypeError, ValueError):

                continue

            absolute_change = round(
                v2 - v1,
                2
            )

            percentage_change = None

            if v1 != 0:

                percentage_change = round(
                    (v2 - v1) / v1 * 100,
                    1
                )

            comparisons.append({

                'test_name':
                r1.test_name,

                'unit':
                r1.unit,

                'previous_value':
                v1,

                'latest_value':
                v2,

                'absolute_change':
                absolute_change,

                'percentage_change':
                percentage_change,

                'previous_status':
                r1.status,

                'latest_status':
                r2.status,

            })

        comparisons.sort(
            key=lambda c:
            c['test_name']
        )

        return Response({

            'previous_report': {

                'id':
                doc1.id,

                'title':
                doc1.title,

                'uploaded_at':
                doc1.uploaded_at,

            },

            'latest_report': {

                'id':
                doc2.id,

                'title':
                doc2.title,

                'uploaded_at':
                doc2.uploaded_at,

            },

            'comparisons':
            comparisons,

        })


class ReportChatView(APIView):
    permission_classes = [
        permissions.IsAuthenticated
    ]

    def post(self, request, pk):

        question = request.data.get(
            'question',
            ''
        ).strip()

        if not question:

            return Response(
                {
                    "detail":
                    "Please provide a question."
                },
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:

            document = HealthDocument.objects.get(
                pk=pk,
                user=request.user
            )

            analysis = document.analysis

        except (
            HealthDocument.DoesNotExist,
            DocumentAnalysis.DoesNotExist
        ):

            return Response(
                {
                    "detail":
                    "Analyzed report not found."
                },
                status=http_status.HTTP_404_NOT_FOUND
            )

        context = {

            'report_title':
            document.title,

            'summary':
            analysis.summary,

            'test_results': [

                {
                    'test_name':
                    r.test_name,

                    'value':
                    r.value,

                    'unit':
                    r.unit,

                    'reference_range':
                    r.reference_range,

                    'status':
                    r.status,

                }

                for r in analysis.test_results.all()
            ],

        }

        try:

            answer = ask_about_report(
                context,
                question
            )

        except GeminiServiceError as error:

            return Response(
                {
                    "detail":
                    f"Chat temporarily unavailable: {error}"
                },
                status=http_status.HTTP_503_SERVICE_UNAVAILABLE
            )

        except Exception as error:

            return Response(
                {
                    "detail":
                    f"Chat failed: {error}"
                },
                status=http_status.HTTP_502_BAD_GATEWAY
            )

        return Response({

            "answer":
            answer

        })