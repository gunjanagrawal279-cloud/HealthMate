from django.urls import path
from .views import (
    DocumentUploadView, DocumentListView, DocumentDetailView,
    DocumentAnalyzeView, DocumentAnalysisDetailView, HealthTimelineView,
    CompareReportsView, ReportChatView,
)

urlpatterns = [
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('timeline/', HealthTimelineView.as_view(), name='document-timeline'),
    path('compare/', CompareReportsView.as_view(), name='document-compare'),
    path('', DocumentListView.as_view(), name='document-list'),
    path('<int:pk>/', DocumentDetailView.as_view(), name='document-detail'),
    path('<int:pk>/analyze/', DocumentAnalyzeView.as_view(), name='document-analyze'),
    path('<int:pk>/analysis/', DocumentAnalysisDetailView.as_view(), name='document-analysis'),
    path('<int:pk>/chat/', ReportChatView.as_view(), name='document-chat'),
]