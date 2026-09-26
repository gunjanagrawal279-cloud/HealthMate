from rest_framework import serializers
from .models import HealthProfile


class HealthProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthProfile
        fields = [
            'id', 'full_name', 'age', 'gender', 'blood_group',
            'height', 'weight', 'allergies', 'health_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']