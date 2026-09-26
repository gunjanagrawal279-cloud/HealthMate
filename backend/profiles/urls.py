from django.urls import path
from .views import HealthProfileView

urlpatterns = [
    path('', HealthProfileView.as_view(), name='profile'),
]