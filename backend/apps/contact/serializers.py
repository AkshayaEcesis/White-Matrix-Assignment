from rest_framework import serializers

from .models import ContactEnquiry


class ContactEnquirySerializer(serializers.ModelSerializer):
    name = serializers.CharField(min_length=2, max_length=120)
    subject = serializers.CharField(min_length=3, max_length=200)
    message = serializers.CharField(min_length=10, max_length=3000)

    class Meta:
        model = ContactEnquiry
        fields = ("id", "name", "email", "subject", "message", "is_reviewed", "created_at")
        read_only_fields = ("id", "is_reviewed", "created_at")
