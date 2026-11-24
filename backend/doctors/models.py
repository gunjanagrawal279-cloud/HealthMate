
from django.db import models
from django.contrib.auth.models import User
from documents.models import HealthDocument


class Doctor(models.Model):
    SPECIALTIES = [
        ('cardiologist', 'Cardiologist'),
        ('dermatologist', 'Dermatologist'),
        ('diabetologist', 'Diabetologist'),
        ('general', 'General Physician'),
        ('gynecologist', 'Gynecologist'),
        ('neurologist', 'Neurologist'),
        ('orthopedic', 'Orthopedic'),
        ('pulmonologist', 'Pulmonologist'),
    ]

    name = models.CharField(max_length=150)
    specialization = models.CharField(max_length=50, choices=SPECIALTIES)
    qualification = models.CharField(max_length=200)
    experience = models.PositiveIntegerField(default=0)
    hospital = models.CharField(max_length=200)
    city = models.CharField(max_length=100)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    available = models.BooleanField(default=True)
    phone = models.CharField(max_length=20, blank=True)
    bio = models.TextField(blank=True)

    # Existing doctor can be connected to a login account
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctor_profile'
    )

    verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Dr. {self.name} - {self.get_specialization_display()}"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    patient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='patient_appointments'
    )
    doctor = models.ForeignKey(
        Doctor, on_delete=models.CASCADE, related_name='appointments'
    )
    report = models.ForeignKey(
        HealthDocument,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doctor_appointments'
    )
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    consultation_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.patient.username} - Dr. {self.doctor.name}"


class Prescription(models.Model):
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name='prescriptions'
    )
    medicine_name = models.CharField(max_length=200)
    dosage = models.CharField(max_length=100)
    frequency = models.CharField(max_length=100)
    duration = models.CharField(max_length=100)
    instructions = models.TextField(blank=True)
    prescribed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.medicine_name


class DietPlan(models.Model):
    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name='diet_plan'
    )
    title = models.CharField(max_length=200)
    breakfast = models.TextField(blank=True)
    lunch = models.TextField(blank=True)
    dinner = models.TextField(blank=True)
    snacks = models.TextField(blank=True)
    lifestyle_advice = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
