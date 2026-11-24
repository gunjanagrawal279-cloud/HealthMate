
from django.urls import path

from .views import (
    DoctorListView,
    DoctorDetailView,
    AppointmentListCreateView,
    AppointmentDetailView,
    ConsultationUpdateView,
    PrescriptionCreateView,
    PatientPrescriptionListView,
    DietPlanCreateView,
    PatientDietPlanListView,
)

urlpatterns = [
    # Doctor directory
    path('', DoctorListView.as_view(), name='doctor-list'),
    path('<int:pk>/', DoctorDetailView.as_view(), name='doctor-detail'),

    # Appointments
    path('appointments/', AppointmentListCreateView.as_view(), name='appointments'),
    path('appointments/<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),

    # Doctor consultation
    path(
        'appointments/<int:pk>/consultation/',
        ConsultationUpdateView.as_view(),
        name='consultation-update'
    ),

    # Prescriptions
    path('prescriptions/create/', PrescriptionCreateView.as_view(), name='prescription-create'),
    path('prescriptions/my/', PatientPrescriptionListView.as_view(), name='patient-prescriptions'),

    # Diet plans
    path('diet-plans/create/', DietPlanCreateView.as_view(), name='diet-plan-create'),
    path('diet-plans/my/', PatientDietPlanListView.as_view(), name='patient-diet-plans'),
]
