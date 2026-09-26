from django.urls import path

from .views import DashboardStatsView, ProgressView


urlpatterns = [
    path('', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('progress/', ProgressView.as_view(), name='dashboard-progress'),
]