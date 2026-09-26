from django.contrib import admin
from .models import HealthDocument, DocumentAnalysis, ExtractedTestResult


class ExtractedTestResultInline(admin.TabularInline):
    model = ExtractedTestResult
    extra = 0


@admin.register(HealthDocument)
class HealthDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'document_type', 'analysis_status', 'uploaded_at')
    list_filter = ('document_type', 'analysis_status')
    search_fields = ('title', 'user__username')


@admin.register(DocumentAnalysis)
class DocumentAnalysisAdmin(admin.ModelAdmin):
    list_display = ('document', 'created_at', 'updated_at')
    inlines = [ExtractedTestResultInline]


@admin.register(ExtractedTestResult)
class ExtractedTestResultAdmin(admin.ModelAdmin):
    list_display = ('test_name', 'value', 'unit', 'status', 'analysis')
    list_filter = ('status',)