from django.contrib import admin
from .models import HealthProfile


@admin.register(HealthProfile)
class HealthProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'user', 'age', 'gender', 'blood_group', 'updated_at')
    search_fields = ('full_name', 'user__username')