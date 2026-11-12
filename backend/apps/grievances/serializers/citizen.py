from rest_framework import serializers

from apps.core.choices import Category, District
from apps.core.validators import validate_upload_list

from ..models import ActionTakenReport, Attachment, Feedback, Grievance, GrievanceRemark
from .common import (
    AttachmentSerializer,
    CitizenHistorySerializer,
    FeedbackSerializer,
    GrievanceListSerializer,
    RemarkSerializer,
)


class GrievanceCreateSerializer(serializers.Serializer):
    district = serializers.ChoiceField(choices=District.choices)
    category = serializers.ChoiceField(choices=Category.choices)
    subject = serializers.CharField(min_length=5, max_length=200)
    description = serializers.CharField(min_length=30, max_length=5000)
    attachments = serializers.ListField(child=serializers.FileField(), required=False, default=list)
    ai_analysis_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_attachments(self, files):
        return validate_upload_list(files)  # -> list of (file, trusted_content_type)


class CitizenGrievanceDetailSerializer(GrievanceListSerializer):
    """What the owning citizen sees. Internal remarks/history and other citizens' data are excluded."""

    description = serializers.CharField()
    attachments = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()
    remarks = serializers.SerializerMethodField()
    resolution = serializers.SerializerMethodField()
    feedback = FeedbackSerializer(many=True, read_only=True)
    can_give_feedback = serializers.SerializerMethodField()
    can_reopen = serializers.SerializerMethodField()
    ai_suggestion = serializers.SerializerMethodField()

    class Meta(GrievanceListSerializer.Meta):
        fields = GrievanceListSerializer.Meta.fields + (
            "description", "attachments", "history", "remarks", "resolution", "feedback",
            "can_give_feedback", "can_reopen", "resolved_at", "ai_suggestion",
        )

    def get_attachments(self, obj):
        qs = obj.attachments.filter(kind=Attachment.Kind.EVIDENCE)
        return AttachmentSerializer(qs, many=True).data

    def get_history(self, obj):
        return CitizenHistorySerializer(obj.history.filter(is_public=True).select_related("changed_by"), many=True).data

    def get_remarks(self, obj):
        qs = obj.remarks.filter(visibility=GrievanceRemark.Visibility.PUBLIC).select_related("author")
        data = RemarkSerializer(qs, many=True).data
        for item in data:  # show staff role, not staff names, to citizens
            item["author"]["full_name"] = item["author"]["role_label"]
        return data

    def get_resolution(self, obj):
        report = obj.action_reports.filter(review_status=ActionTakenReport.ReviewStatus.APPROVED).first()
        if not report:
            return None
        return {"resolution_details": report.resolution_details, "action_taken": report.action_taken, "approved_at": report.reviewed_at}

    def get_can_give_feedback(self, obj):
        return obj.status == Grievance.Status.RESOLVED and not Feedback.objects.filter(
            grievance=obj, resolution_cycle=obj.reopened_count
        ).exists()

    def get_can_reopen(self, obj):
        return obj.status == Grievance.Status.RESOLVED

    def get_ai_suggestion(self, obj):
        ai = obj.ai_analysis or {}
        if not ai:
            return None
        return {k: ai.get(k) for k in ("source", "ai_available", "suggested_category", "suggested_priority", "summary")}


class PublicTrackSerializer(serializers.ModelSerializer):
    """Public tracking: status, department and status history only - no personal data or free text."""

    status_label = serializers.CharField(source="get_status_display")
    district_label = serializers.CharField(source="get_district_display")
    category_label = serializers.CharField(source="get_category_display")
    department = serializers.CharField(source="department.name", default=None)
    timeline = serializers.SerializerMethodField()

    class Meta:
        model = Grievance
        fields = (
            "reference_number", "status", "status_label", "district_label", "category_label",
            "department", "created_at", "updated_at", "resolved_at", "timeline",
        )

    def get_timeline(self, obj):
        return [
            {
                "event_label": h.get_event_type_display(),
                "to_status": h.to_status,
                "to_status_label": h.get_to_status_display() if h.to_status else "",
                "actor_role": h.changed_by.get_role_display() if h.changed_by else "System",
                "created_at": h.created_at,
            }
            for h in obj.history.filter(is_public=True).select_related("changed_by")
        ]
