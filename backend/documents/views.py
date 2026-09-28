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
    Single source of truth for LOW/NORMAL/HIGH/UNKNOWN.

    AI extracts the value and reference range.
    Backend calculates the final status.
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


def _normalize_and_save_analysis(document, ai_result):
    """
    Normalize Gemini output, calculate test statuses,
    save/update DocumentAnalysis and recreate test results.
    """

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

        ref_low = item.get(
            'reference_low'
        )

        ref_high = item.get(
            'reference_high'
        )

        try:
            ref_low = (
                float(ref_low)
                if ref_low is not None
                else None
            )
        except (TypeError, ValueError):
            ref_low = None

        try:
            ref_high = (
                float(ref_high)
                if ref_high is not None
                else None
            )
        except (TypeError, ValueError):
            ref_high = None

        value_str = item.get(
            'value',
            ''
        ) or ''

        calculated_status = calculate_status(
            value_str,
            ref_low,
            ref_high
        )

        test_name = item.get(
            'test_name',
            'Unknown Test'
        ) or 'Unknown Test'

        if calculated_status in (
            'LOW',
            'HIGH'
        ):
            abnormal_names.append(
                test_name
            )

        processed_results.append({
            'test_name': test_name,

            'value': value_str,

            'unit': item.get(
                'unit',
                ''
            ) or '',

            'reference_range': item.get(
                'reference_range',
                ''
            ) or '',

            'reference_low': ref_low,

            'reference_high': ref_high,

            'status': calculated_status,

            'explanation': item.get(
                'explanation',
                ''
            ) or '',
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
        # STEP 1
        # Try normal PDF text extraction first.
        # ==================================================

        try:

            text = extract_text_from_pdf(
                document.file.path
            )

            # Some scanned PDFs technically open,
            # but contain no selectable/readable text.

            if not text or not text.strip():

                raise PDFExtractionError(
                    "No readable text found in this PDF. "
                    "Trying scanned PDF analysis."
                )

        except PDFExtractionError:

            # ==================================================
            # SCANNED PDF FALLBACK
            # Send complete PDF directly to Gemini.
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

                analysis = _normalize_and_save_analysis(
                    document,
                    ai_result
                )

                return Response({
                    "detail":
                    "Scanned PDF analyzed successfully.",

                    "analysis_id":
                    analysis.id,
                })

            except GeminiServiceError as e:

                document.analysis_status = 'FAILED'

                document.save(
                    update_fields=['analysis_status']
                )

                return Response(
                    {
                        "detail":
                        f"AI analysis failed: {e}"
                    },
                    status=http_status.HTTP_502_BAD_GATEWAY
                )

            except Exception as e:

                document.analysis_status = 'FAILED'

                document.save(
                    update_fields=['analysis_status']
                )

                return Response(
                    {
                        "detail":
                        f"Scanned PDF analysis failed: {e}"
                    },
                    status=http_status.HTTP_502_BAD_GATEWAY
                )

        # ==================================================
        # STEP 2
        # Save extracted text for normal PDFs.
        # ==================================================

        document.extracted_text = text

        document.save(
            update_fields=['extracted_text']
        )

        # ==================================================
        # STEP 3
        # Send extracted text to Gemini.
        # Gemini service handles:
        # - temporary 503 retry
        # - fallback models
        # - quota handling
        # ==================================================

        try:

            ai_result = analyze_document_text(
                text
            )

        except GeminiServiceError as e:

            document.analysis_status = 'FAILED'

            document.save(
                update_fields=['analysis_status']
            )

            return Response(
                {
                    "detail":
                    f"AI analysis failed: {e}"
                },
                status=http_status.HTTP_502_BAD_GATEWAY
            )

        except Exception as e:

            document.analysis_status = 'FAILED'

            document.save(
                update_fields=['analysis_status']
            )

            return Response(
                {
                    "detail":
                    f"AI analysis failed: {e}"
                },
                status=http_status.HTTP_502_BAD_GATEWAY
            )

        # ==================================================
        # STEP 4
        # Normalize + save analysis.
        # ==================================================

        try:

            analysis = _normalize_and_save_analysis(
                document,
                ai_result
            )

        except Exception as e:

            document.analysis_status = 'FAILED'

            document.save(
                update_fields=['analysis_status']
            )

            return Response(
                {
                    "detail":
                    f"Could not save AI analysis: {e}"
                },
                status=http_status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({

            "detail":
            "Document analyzed successfully.",

            "analysis_id":
            analysis.id,

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

        # Earlier report = previous
        # Later report = latest

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

            # Compare only when units match.

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
                    (v2 - v1)
                    /
                    v1
                    *
                    100,
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

        except GeminiServiceError as e:

            return Response(
                {
                    "detail":
                    f"Chat failed: {e}"
                },
                status=http_status.HTTP_502_BAD_GATEWAY
            )

        except Exception as e:

            return Response(
                {
                    "detail":
                    f"Chat failed: {e}"
                },
                status=http_status.HTTP_502_BAD_GATEWAY
            )

        return Response({

            "answer":
            answer

        })