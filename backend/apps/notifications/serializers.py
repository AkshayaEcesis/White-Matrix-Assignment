from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    reference_number = serializers.CharField(source="grievance.reference_number", default=None, read_only=True)

    class Meta:
        model = Notification
        fields = ("id", "title", "message", "is_read", "reference_number", "created_at")
        read_only_fields = fields
