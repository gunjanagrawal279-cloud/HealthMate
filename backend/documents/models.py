from django.db import models
from django.contrib.auth.models import User


class HealthDocument(models.Model):
    DOCUMENT_TYPE_CHOICES = [
        ('BLOOD_TEST', 'Blood Test'),
        ('CBC', 'CBC'),
        ('LIPID_PROFILE', 'Lipid Profile'),
        ('DIABETES_TEST', 'Diabetes Test'),
        ('THYROID_TEST', 'Thyroid Test'),
        ('LIVER_FUNCTION', 'Liver Function Test'),
        ('KIDNEY_FUNCTION', 'Kidney Function Test'),
        ('PRESCRIPTION', 'Prescription'),
        ('DISCHARGE_SUMMARY', 'Discharge Summary'),
        ('OTHER', 'Other'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('ANALYZED', 'Analyzed'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES, default='OTHER')
    file = models.FileField(upload_to='health_documents/')
    document_date = models.DateField(null=True, blank=True)
    extracted_text = models.TextField(blank=True)
    analysis_status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class DocumentAnalysis(models.Model):
    document = models.OneToOneField(HealthDocument, on_delete=models.CASCADE, related_name='analysis')
    summary = models.TextField(blank=True)
    key_observations = models.JSONField(default=list, blank=True)
    abnormal_values = models.JSONField(default=list, blank=True)
    simple_explanations = models.JSONField(default=list, blank=True)
    doctor_questions = models.JSONField(default=list, blank=True)
    raw_ai_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Analysis for {self.document.title}"


class ExtractedTestResult(models.Model):
    STATUS_CHOICES = [
        ('NORMAL', 'Normal'),
        ('LOW', 'Low'),
        ('HIGH', 'High'),
        ('UNKNOWN', 'Unknown'),
    ]

    analysis = models.ForeignKey(DocumentAnalysis, on_delete=models.CASCADE, related_name='test_results')
    test_name = models.CharField(max_length=150)
    value = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=30, blank=True)
    reference_range = models.CharField(max_length=100, blank=True)
    reference_low = models.FloatField(null=True, blank=True)
    reference_high = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='UNKNOWN')
    explanation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.test_name}: {self.value} ({self.status})"