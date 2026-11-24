
from rest_framework import serializers
from .models import (
    Doctor,
    Appointment,
    Prescription,
    DietPlan,
)


class DoctorSerializer(serializers.ModelSerializer):
    specialization_display = serializers.CharField(
        source='get_specialization_display',
        read_only=True
    )

    class Meta:
        model = Doctor
        fields = '__all__'


class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(
        source='doctor.name',
        read_only=True
    )
    patient_name = serializers.CharField(
        source='patient.username',
        read_only=True
    )

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = (
            'patient',
            'status',
            'consultation_notes',
            'created_at',
        )


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = '__all__'
        read_only_fields = ('prescribed_at',)


class DietPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = DietPlan
        fields = '__all__'
        read_only_fields = ('created_at',)
