from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.core.choices import Category, District
from apps.core.models import TimeStampedModel
from apps.core.validators import attachment_upload_path

User = settings.AUTH_USER_MODEL


class ReferenceSequence(models.Model):
    """Per-year counter used to generate gap-free reference numbers (CMK-2026-00001)."""

    year = models.PositiveIntegerField(primary_key=True)
    last_number = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.year}: {self.last_number}"


class Grievance(TimeStampedModel):
    class Status(models.TextChoices):
        SUBMITTED = "SUBMITTED", "Submitted"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        REOPENED = "REOPENED", "Reopened"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"

    class PrioritySource(models.TextChoices):
        AI_SUGGESTED = "AI_SUGGESTED", "AI suggested (awaiting CMO confirmation)"
        CMO_CONFIRMED = "CMO_CONFIRMED", "Confirmed by CMO"

    # Service-level target (days) used to compute due_at and "overdue".
    SLA_DAYS = {Priority.HIGH: 7, Priority.MEDIUM: 15, Priority.LOW: 30}

    reference_number = models.CharField(max_length=20, unique=True, editable=False)
    citizen = models.ForeignKey(User, on_delete=models.PROTECT, related_name="grievances")
    district = models.CharField(max_length=30, choices=District.choices, db_index=True)
    category = models.CharField(max_length=40, choices=Category.choices, db_index=True)
    subject = models.CharField(max_length=200)
    description = models.TextField()

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUBMITTED, db_index=True)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM, db_index=True)
    priority_source = models.CharField(
        max_length=20, choices=PrioritySource.choices, default=PrioritySource.AI_SUGGESTED
    )

    # Current routing (full routing history lives in DepartmentAssignment)
    department = models.ForeignKey(
        "departments.Department", on_delete=models.PROTECT, null=True, blank=True, related_name="grievances"
    )
    assigned_officer = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, blank=True, related_name="assigned_grievances"
    )

    # AI assistant output (advisory only - never applied as an official decision)
    ai_suggested_department = models.ForeignKey(
        "departments.Department", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    ai_analysis = models.JSONField(null=True, blank=True)
    ai_summary = models.TextField(blank=True)

    is_escalated = models.BooleanField(default=False, db_index=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    due_at = models.DateTimeField(db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    reopened_count = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "district"], name="grv_status_district_idx"),
            models.Index(fields=["department", "status"], name="grv_dept_status_idx"),
            models.Index(fields=["citizen", "-created_at"], name="grv_citizen_recent_idx"),
        ]

    def __str__(self):
        return f"{self.reference_number} - {self.subject}"

    @property
    def is_overdue(self):
        return self.status != self.Status.RESOLVED and self.due_at is not None and self.due_at < timezone.now()

    def compute_due_at(self, start=None):
        start = start or self.created_at or timezone.now()
        return start + timedelta(days=self.SLA_DAYS[self.priority])


class GrievanceHistory(models.Model):
    """Immutable audit trail. Every status change (and other key event) creates one row."""

    class EventType(models.TextChoices):
        CREATED = "CREATED", "Grievance submitted"
        STATUS_CHANGED = "STATUS_CHANGED", "Status changed"
        ASSIGNED = "ASSIGNED", "Assigned to department"
        PROGRESS_UPDATE = "PROGRESS_UPDATE", "Progress update"
        REPORT_SUBMITTED = "REPORT_SUBMITTED", "Action-taken report submitted"
        REPORT_APPROVED = "REPORT_APPROVED", "Action-taken report approved"
        REPORT_REJECTED = "REPORT_REJECTED", "Additional action requested"
        ESCALATED = "ESCALATED", "Escalated"
        TRIAGE_UPDATED = "TRIAGE_UPDATED", "Priority/category updated"
        REOPENED = "REOPENED", "Reopened"
        FEEDBACK = "FEEDBACK", "Citizen feedback received"

    grievance = models.ForeignKey(Grievance, on_delete=models.PROTECT, related_name="history")
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    from_status = models.CharField(max_length=20, choices=Grievance.Status.choices, blank=True)
    to_status = models.CharField(max_length=20, choices=Grievance.Status.choices, blank=True)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="+")
    remarks = models.TextField(blank=True)
    is_public = models.BooleanField(default=True, help_text="Visible to the citizen.")
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]
        verbose_name_plural = "grievance history"

    def save(self, *args, **kwargs):
        if self.pk is not None:
            raise ValueError("Grievance history records are immutable.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Grievance history records cannot be deleted.")


class DepartmentAssignment(models.Model):
    """Every routing decision made by the CMO. Only one assignment can be active per grievance."""

    grievance = models.ForeignKey(Grievance, on_delete=models.PROTECT, related_name="assignments")
    department = models.ForeignKey("departments.Department", on_delete=models.PROTECT, related_name="assignments")
    officer = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="assignments")
    assigned_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")
    instructions = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["grievance"], condition=Q(is_active=True), name="unique_active_assignment_per_grievance"
            )
        ]


class ActionTakenReport(TimeStampedModel):
    class ReviewStatus(models.TextChoices):
        PENDING = "PENDING", "Pending CMO review"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Additional action requested"

    grievance = models.ForeignKey(Grievance, on_delete=models.PROTECT, related_name="action_reports")
    assignment = models.ForeignKey(DepartmentAssignment, on_delete=models.PROTECT, null=True, related_name="reports")
    officer = models.ForeignKey(User, on_delete=models.PROTECT, related_name="action_reports")
    action_taken = models.TextField()
    resolution_details = models.TextField()
    review_status = models.CharField(
        max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.PENDING, db_index=True
    )
    reviewed_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="+")
    review_remarks = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["grievance"], condition=Q(review_status="PENDING"), name="one_pending_report_per_grievance"
            )
        ]


class Attachment(models.Model):
    class Kind(models.TextChoices):
        EVIDENCE = "EVIDENCE", "Citizen evidence"
        ACTION_REPORT = "ACTION_REPORT", "Action-taken report document"

    grievance = models.ForeignKey(Grievance, on_delete=models.PROTECT, related_name="attachments")
    action_report = models.ForeignKey(
        ActionTakenReport, on_delete=models.PROTECT, null=True, blank=True, related_name="attachments"
    )
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.EVIDENCE)
    file = models.FileField(upload_to=attachment_upload_path, max_length=255)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class GrievanceRemark(models.Model):
    """
    Remarks on a grievance. INTERNAL = staff only (CMO internal administrative remarks and
    officer investigation notes). PUBLIC = also shown to the citizen.
    """

    class Visibility(models.TextChoices):
        INTERNAL = "INTERNAL", "Internal (staff only)"
        PUBLIC = "PUBLIC", "Public (visible to citizen)"

    grievance = models.ForeignKey(Grievance, on_delete=models.PROTECT, related_name="remarks")
    author = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")
    text = models.TextField()
    visibility = models.CharField(max_length=10, choices=Visibility.choices, default=Visibility.INTERNAL)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]


class Feedback(models.Model):
    """Citizen feedback after a resolution. One per resolution cycle (a reopened case can be rated again)."""

    grievance = models.ForeignKey(Grievance, on_delete=models.PROTECT, related_name="feedback")
    citizen = models.ForeignKey(User, on_delete=models.PROTECT, related_name="+")
    resolution_cycle = models.PositiveSmallIntegerField(default=0)
    rating = models.PositiveSmallIntegerField()
    is_satisfied = models.BooleanField()
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["grievance", "resolution_cycle"], name="one_feedback_per_resolution"),
            models.CheckConstraint(condition=Q(rating__gte=1) & Q(rating__lte=5), name="feedback_rating_1_to_5"),
        ]
