
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Doctor, Appointment, Prescription, DietPlan
from .serializers import (
    DoctorSerializer,
    AppointmentSerializer,
    PrescriptionSerializer,
    DietPlanSerializer,
)


class DoctorListView(generics.ListAPIView):
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Doctor.objects.filter(available=True, verified=True)

        specialty = self.request.query_params.get('specialization')
        city = self.request.query_params.get('city')

        if specialty:
            queryset = queryset.filter(specialization=specialty)

        if city:
            queryset = queryset.filter(city__icontains=city)

        return queryset.order_by('-experience')


class DoctorDetailView(generics.RetrieveAPIView):
    queryset = Doctor.objects.filter(available=True, verified=True)
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]


class AppointmentListCreateView(generics.ListCreateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # Doctor sees only their own appointments
        doctor_profile = getattr(user, 'doctor_profile', None)

        if doctor_profile:
            return Appointment.objects.filter(
                doctor=doctor_profile
            ).select_related('patient', 'doctor', 'report')

        # Patient sees only their own appointments
        return Appointment.objects.filter(
            patient=user
        ).select_related('patient', 'doctor', 'report')

    def perform_create(self, serializer):
        doctor_id = self.request.data.get('doctor')

        try:
            doctor = Doctor.objects.get(
                id=doctor_id,
                available=True,
                verified=True
            )
        except (Doctor.DoesNotExist, TypeError, ValueError):
            raise ValidationError({
                'doctor': 'Selected doctor is not available or verified.'
            })

        if getattr(self.request.user, 'doctor_profile', None):
            raise PermissionDenied('Doctor accounts cannot book patient appointments.')

        report = serializer.validated_data.get('report')

        if report and report.user_id != self.request.user.id:
            raise PermissionDenied('You can only attach your own report.')

        serializer.save(patient=self.request.user, doctor=doctor)


class AppointmentDetailView(generics.RetrieveAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        doctor_profile = getattr(user, 'doctor_profile', None)

        if doctor_profile:
            return Appointment.objects.filter(doctor=doctor_profile)

        return Appointment.objects.filter(patient=user)


class ConsultationUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        doctor = getattr(request.user, 'doctor_profile', None)

        if not doctor:
            raise PermissionDenied('Only doctor accounts can update consultations.')

        try:
            appointment = Appointment.objects.get(pk=pk, doctor=doctor)
        except Appointment.DoesNotExist:
            raise ValidationError('Appointment not found.')

        if appointment.status == 'CANCELLED':
            raise ValidationError('Cancelled appointments cannot be completed.')

        notes = request.data.get('consultation_notes', '').strip()

        if not notes:
            raise ValidationError({
                'consultation_notes': 'Consultation notes are required.'
            })

        appointment.consultation_notes = notes
        appointment.status = 'COMPLETED'
        appointment.save()

        return Response(AppointmentSerializer(appointment).data)


class PrescriptionCreateView(generics.CreateAPIView):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        doctor = getattr(self.request.user, 'doctor_profile', None)

        if not doctor:
            raise PermissionDenied('Only doctors can prescribe medicines.')

        appointment_id = self.request.data.get('appointment')

        try:
            appointment = Appointment.objects.get(
                pk=appointment_id,
                doctor=doctor,
                status='COMPLETED'
            )
        except (Appointment.DoesNotExist, TypeError, ValueError):
            raise ValidationError(
                'Completed appointment not found for this doctor.'
            )

        serializer.save(appointment=appointment)


class PatientPrescriptionListView(generics.ListAPIView):
    serializer_class = PrescriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, 'doctor_profile', None):
            raise PermissionDenied('This page is for patients only.')

        return Prescription.objects.filter(
            appointment__patient=self.request.user
        ).select_related('appointment', 'appointment__doctor')


class DietPlanCreateView(generics.CreateAPIView):
    serializer_class = DietPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        doctor = getattr(self.request.user, 'doctor_profile', None)

        if not doctor:
            raise PermissionDenied('Only doctors can create diet plans.')

        appointment_id = self.request.data.get('appointment')

        try:
            appointment = Appointment.objects.get(
                pk=appointment_id,
                doctor=doctor,
                status='COMPLETED'
            )
        except (Appointment.DoesNotExist, TypeError, ValueError):
            raise ValidationError(
                'Completed appointment not found for this doctor.'
            )

        serializer.save(appointment=appointment)


class PatientDietPlanListView(generics.ListAPIView):
    serializer_class = DietPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self.request.user, 'doctor_profile', None):
            raise PermissionDenied('This page is for patients only.')

        return DietPlan.objects.filter(
            appointment__patient=self.request.user
        ).select_related('appointment', 'appointment__doctor')
