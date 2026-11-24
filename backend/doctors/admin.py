
from django.contrib import admin
from .models import Doctor, Appointment, Prescription, DietPlan


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'specialization',
        'hospital',
        'city',
        'experience',
        'consultation_fee',
        'user',
        'verified',
        'available',
    )
    list_filter = ('specialization', 'city', 'available', 'verified')
    search_fields = ('name', 'hospital', 'city', 'user__username')


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'doctor', 'appointment_date', 'appointment_time', 'status')
    list_filter = ('status', 'appointment_date')
    search_fields = ('patient__username', 'doctor__name')


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('medicine_name', 'appointment', 'dosage', 'frequency', 'duration')
    search_fields = ('medicine_name',)


@admin.register(DietPlan)
class DietPlanAdmin(admin.ModelAdmin):
    list_display = ('title', 'appointment', 'created_at')
    search_fields = ('title',)
