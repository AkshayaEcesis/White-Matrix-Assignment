from rest_framework import serializers

from apps.accounts.models import User
from apps.core.choices import Category
from apps.core.validators import validate_upload_list
from apps.departments.models import Department

from ..models import Grievance
from .common import (
    ActionReportSerializer,
    AssignmentSerializer,
    AttachmentSerializer,
    FeedbackSerializer,
    HistorySerializer,
    RemarkSerializer,
    StaffGrievanceListSerializer,
)


class StaffGrievanceDetailSerializer(StaffGrievanceListSerializer):
    """Full record for CMO administrators and the assigned department officer."""

    description = serializers.CharField()
    citizen = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)
    history = serializers.SerializerMethodField()
    remarks = serializers.SerializerMethodField()
    assignments = AssignmentSerializer(many=True, read_only=True)
    action_reports = ActionReportSerializer(many=True, read_only=True)
    feedback = FeedbackSerializer(many=True, read_only=True)
    ai_suggested_department = serializers.SerializerMethodField()
    priority_source_label = serializers.CharField(source="get_priority_source_display")
    assigned_officer_id = serializers.IntegerField(read_only=True)

    class Meta(StaffGrievanceListSerializer.Meta):
        fields = StaffGrievanceListSerializer.Meta.fields + (
            "description", "citizen", "attachments", "history", "remarks", "assignments",
            "action_reports", "feedback", "ai_analysis", "ai_suggested_department", "priority_source",
            "priority_source_label", "escalated_at", "resolved_at", "reopened_count", "assigned_officer_id",
        )

    def get_citizen(self, obj):
        c = obj.citizen
        return {"full_name": c.full_name, "email": c.email, "mobile": c.mobile}

    def get_history(self, obj):
        return HistorySerializer(obj.history.select_related("changed_by"), many=True).data

    def get_remarks(self, obj):
        return RemarkSerializer(obj.remarks.select_related("author"), many=True).data

    def get_ai_suggested_department(self, obj):
        d = obj.ai_suggested_department
        return {"id": d.id, "name": d.name} if d else None


class AssignSerializer(serializers.Serializer):
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.filter(is_active=True))
    officer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=User.Role.OFFICER, is_active=True), required=False, allow_null=True
    )
    instructions = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class TriageSerializer(serializers.Serializer):
    priority = serializers.ChoiceField(choices=Grievance.Priority.choices, required=False)
    category = serializers.ChoiceField(choices=Category.choices, required=False)


class ReportReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=[("APPROVE", "Approve"), ("REJECT", "Request additional action")])
    remarks = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if attrs["decision"] == "REJECT" and len(attrs["remarks"].strip()) < 10:
            raise serializers.ValidationError({"remarks": "Explain what additional action is required (min 10 characters)."})
        return attrs


class ActionReportCreateSerializer(serializers.Serializer):
    action_taken = serializers.CharField(min_length=20, max_length=5000)
    resolution_details = serializers.CharField(min_length=20, max_length=5000)
    attachments = serializers.ListField(child=serializers.FileField(), required=False, default=list)

    def validate_attachments(self, files):
        return validate_upload_list(files)
