from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    total_reports = serializers.IntegerField()
    analyzed_reports = serializers.IntegerField()
    abnormal_observations = serializers.IntegerField()
    recent_reports = serializers.ListField()