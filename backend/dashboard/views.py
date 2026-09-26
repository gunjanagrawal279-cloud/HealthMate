from collections import defaultdict

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from documents.models import HealthDocument, ExtractedTestResult


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_docs = HealthDocument.objects.filter(user=request.user)

        total_reports = user_docs.count()
        analyzed_reports = user_docs.filter(
            analysis_status='ANALYZED'
        ).count()

        abnormal_observations = ExtractedTestResult.objects.filter(
            analysis__document__user=request.user,
            status__in=['LOW', 'HIGH'],
        ).count()

        # Count test names having 2+ numeric values
        all_results = ExtractedTestResult.objects.filter(
            analysis__document__user=request.user
        )

        name_counts = defaultdict(int)

        for result in all_results:
            try:
                float(result.value)
                name = result.test_name.strip().lower()
                name_counts[name] += 1
            except (TypeError, ValueError):
                continue

        trends_available = sum(
            1 for count in name_counts.values()
            if count > 1
        )

        recent = user_docs.order_by('-uploaded_at')[:5]

        recent_reports = [
            {
                'id': document.id,
                'title': document.title,
                'document_type': document.document_type,
                'analysis_status': document.analysis_status,
                'uploaded_at': document.uploaded_at,
            }
            for document in recent
        ]

        # Build factual insights
        insights = []

        if total_reports > 0:
            insights.append(
                f"{total_reports} report"
                f"{'s' if total_reports != 1 else ''} uploaded so far."
            )

        if analyzed_reports > 0:
            insights.append(
                f"{analyzed_reports} report"
                f"{'s' if analyzed_reports != 1 else ''} analyzed by AI."
            )

        latest_analyzed = (
            user_docs
            .filter(analysis_status='ANALYZED')
            .order_by('-uploaded_at')
            .first()
        )

        if latest_analyzed:
            try:
                parameter_count = (
                    latest_analyzed.analysis.test_results.count()
                )

                if parameter_count > 0:
                    insights.append(
                        f"{parameter_count} parameter"
                        f"{'s' if parameter_count != 1 else ''} "
                        "detected in your latest analyzed report."
                    )
            except Exception:
                pass

        if abnormal_observations > 0:
            insights.append(
                f"{abnormal_observations} value"
                f"{'s' if abnormal_observations != 1 else ''} "
                "outside the reference range across your reports."
            )

        if trends_available > 0:
            insights.append(
                f"{trends_available} parameter"
                f"{'s' if trends_available != 1 else ''} "
                "have enough history to show a trend."
            )

        if not insights:
            insights.append(
                "Upload and analyze a report to see your health insights here."
            )

        return Response({
            'total_reports': total_reports,
            'analyzed_reports': analyzed_reports,
            'abnormal_observations': abnormal_observations,
            'trends_available': trends_available,
            'recent_reports': recent_reports,
            'insights': insights,
        })


class ProgressView(APIView):
    """
    Returns historical numeric values for repeated tests.

    Example:

    {
        "trends": {
            "Hemoglobin": [
                {
                    "date": "2026-01-15",
                    "value": 12.1,
                    "unit": "g/dL",
                    "status": "NORMAL"
                }
            ]
        }
    }
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        results = ExtractedTestResult.objects.filter(
            analysis__document__user=request.user,
            analysis__document__analysis_status='ANALYZED'
        ).select_related(
            'analysis__document'
        ).order_by(
            'analysis__document__document_date',
            'analysis__document__uploaded_at'
        )

        grouped = defaultdict(list)

        for result in results:
            # Ignore results that do not have a numeric value
            try:
                value = float(str(result.value).strip())
            except (TypeError, ValueError):
                continue

            # Clean test name
            test_name = (result.test_name or '').strip()

            if not test_name:
                continue

            # Normalize name only for grouping
            normalized_name = ' '.join(
                test_name.lower().split()
            )

            document = result.analysis.document

            # Prefer actual report/document date.
            # If unavailable, use upload date.
            if document.document_date:
                date_value = document.document_date.isoformat()
            else:
                date_value = document.uploaded_at.date().isoformat()

            grouped[normalized_name].append({
                'name': test_name,
                'date': date_value,
                'value': value,
                'unit': result.unit or '',
                'status': result.status or 'UNKNOWN',
            })

        trends = {}

        for normalized_name, points in grouped.items():

            # Sort chronologically
            points.sort(key=lambda item: item['date'])

            # Only repeated tests should appear in Progress
            if len(points) < 2:
                continue

            # Use readable test name
            display_name = points[0]['name']

            trends[display_name] = [
                {
                    'date': point['date'],
                    'value': point['value'],
                    'unit': point['unit'],
                    'status': point['status'],
                }
                for point in points
            ]

        return Response({
            'trends': trends
        })