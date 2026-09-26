from rest_framework import serializers
from .models import HealthDocument, DocumentAnalysis, ExtractedTestResult


class HealthDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthDocument
        fields = [
            'id', 'title', 'document_type', 'file', 'document_date',
            'analysis_status', 'uploaded_at', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'analysis_status', 'uploaded_at', 'created_at', 'updated_at']

    def validate_file(self, value):
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError("Only PDF files are allowed.")
        max_size_mb = 10
        if value.size > max_size_mb * 1024 * 1024:
            raise serializers.ValidationError(f"File size must be under {max_size_mb}MB.")
        return value


class HealthDocumentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthDocument
        fields = [
            'id', 'title', 'document_type', 'document_date',
            'analysis_status', 'uploaded_at',
        ]


class ExtractedTestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtractedTestResult
        fields = [
            'id', 'test_name', 'value', 'unit', 'reference_range',
            'reference_low', 'reference_high', 'status', 'explanation',
        ]


class DocumentAnalysisSerializer(serializers.ModelSerializer):
    test_results = ExtractedTestResultSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentAnalysis
        fields = [
            'id', 'summary', 'key_observations', 'abnormal_values',
            'simple_explanations', 'doctor_questions', 'test_results',
            'created_at', 'updated_at',
        ]


class TimelineSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    document_type = serializers.CharField()
    uploaded_at = serializers.DateTimeField()
    analysis_status = serializers.CharField()
    total_parameters = serializers.IntegerField()
    outside_range_count = serializers.IntegerField()