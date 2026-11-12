from rest_framework import serializers

from apps.departments.serializers import DepartmentMiniSerializer

from ..models import (
    ActionTakenReport,
    Attachment,
    DepartmentAssignment,
    Feedback,
    Grievance,
    GrievanceHistory,
    GrievanceRemark,
)


class PersonSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    role = serializers.CharField()


class AttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ("id", "kind", "original_name", "content_type", "size", "created_at", "download_url")

    def get_download_url(self, obj):
        # Files are never served publicly; this endpoint checks object permissions.
        return f"/attachments/{obj.id}/download/"


class HistorySerializer(serializers.ModelSerializer):
    event_label = serializers.CharField(source="get_event_type_display")
    from_status_label = serializers.SerializerMethodField()
    to_status_label = serializers.SerializerMethodField()
    changed_by = serializers.SerializerMethodField()

    class Meta:
        model = GrievanceHistory
        fields = (
            "id", "event_type", "event_label", "from_status", "from_status_label",
            "to_status", "to_status_label", "changed_by", "remarks", "created_at",
        )

    def get_from_status_label(self, obj):
        return obj.get_from_status_display() if obj.from_status else ""

    def get_to_status_label(self, obj):
        return obj.get_to_status_display() if obj.to_status else ""

    def get_changed_by(self, obj):
        user = obj.changed_by
        if not user:
            return None
        return {"full_name": user.full_name, "role": user.role, "role_label": user.get_role_display()}


class CitizenHistorySerializer(HistorySerializer):
    """Citizens see the role of staff members, not their names."""

    def get_changed_by(self, obj):
        user = obj.changed_by
        if not user:
            return None
        name = user.full_name if user.role == "CITIZEN" else user.get_role_display()
        return {"full_name": name, "role": user.role, "role_label": user.get_role_display()}


class RemarkSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = GrievanceRemark
        fields = ("id", "text", "visibility", "author", "created_at")

    def get_author(self, obj):
        return {"full_name": obj.author.full_name, "role": obj.author.role, "role_label": obj.author.get_role_display()}


class RemarkCreateSerializer(serializers.Serializer):
    text = serializers.CharField(min_length=3, max_length=2000)
    visibility = serializers.ChoiceField(choices=GrievanceRemark.Visibility.choices, default=GrievanceRemark.Visibility.INTERNAL)


class ActionReportSerializer(serializers.ModelSerializer):
    officer = serializers.CharField(source="officer.full_name")
    reviewed_by = serializers.CharField(source="reviewed_by.full_name", default=None)
    review_status_label = serializers.CharField(source="get_review_status_display")
    attachments = AttachmentSerializer(many=True, read_only=True)
    reference_number = serializers.CharField(source="grievance.reference_number")
    grievance_subject = serializers.CharField(source="grievance.subject")
    department = serializers.CharField(source="grievance.department.name", default=None)

    class Meta:
        model = ActionTakenReport
        fields = (
            "id", "reference_number", "grievance_subject", "department", "officer", "action_taken",
            "resolution_details", "review_status", "review_status_label", "reviewed_by", "review_remarks",
            "reviewed_at", "attachments", "created_at",
        )


class AssignmentSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer()
    officer = serializers.CharField(source="officer.full_name", default=None)
    assigned_by = serializers.CharField(source="assigned_by.full_name")

    class Meta:
        model = DepartmentAssignment
        fields = ("id", "department", "officer", "assigned_by", "instructions", "is_active", "created_at", "ended_at")


class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = ("id", "rating", "is_satisfied", "comments", "resolution_cycle", "created_at")


class FeedbackCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    is_satisfied = serializers.BooleanField()
    comments = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class ReasonSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=10, max_length=2000)


class OptionalRemarksSerializer(serializers.Serializer):
    remarks = serializers.CharField(max_length=2000, required=False, allow_blank=True, default="")


class RequiredRemarksSerializer(serializers.Serializer):
    remarks = serializers.CharField(min_length=10, max_length=2000)


class GrievanceListSerializer(serializers.ModelSerializer):
    status_label = serializers.CharField(source="get_status_display")
    priority_label = serializers.CharField(source="get_priority_display")
    district_label = serializers.CharField(source="get_district_display")
    category_label = serializers.CharField(source="get_category_display")
    department = DepartmentMiniSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Grievance
        fields = (
            "id", "reference_number", "subject", "district", "district_label", "category", "category_label",
            "status", "status_label", "priority", "priority_label", "department", "is_escalated",
            "is_overdue", "due_at", "created_at", "updated_at",
        )


class StaffGrievanceListSerializer(GrievanceListSerializer):
    citizen_name = serializers.CharField(source="citizen.full_name")
    assigned_officer = serializers.CharField(source="assigned_officer.full_name", default=None)

    class Meta(GrievanceListSerializer.Meta):
        fields = GrievanceListSerializer.Meta.fields + ("citizen_name", "assigned_officer", "ai_summary")
