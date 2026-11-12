from rest_framework import serializers

from apps.core.choices import District


class AnalyseRequestSerializer(serializers.Serializer):
    description = serializers.CharField(min_length=30, max_length=5000)
    subject = serializers.CharField(max_length=200, required=False, allow_blank=True)
    district = serializers.ChoiceField(choices=District.choices, required=False, allow_blank=True)
