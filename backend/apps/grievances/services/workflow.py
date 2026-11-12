"""
Grievance workflow engine - the ONLY place where grievance state changes.

Valid status transitions (enforced here, never in the UI):

    SUBMITTED    -> UNDER_REVIEW   (CMO starts review / assigns department)
    UNDER_REVIEW -> IN_PROGRESS    (assigned officer starts investigation)
    IN_PROGRESS  -> RESOLVED       (ONLY when the CMO approves an action-taken report)
    RESOLVED     -> REOPENED       (citizen within the reopen window, or CMO)
    REOPENED     -> UNDER_REVIEW   (CMO re-reviews / reassigns)
    REOPENED     -> IN_PROGRESS    (officer resumes investigation)

Every function runs inside a database transaction, locks the grievance row
(SELECT ... FOR UPDATE) and writes an immutable GrievanceHistory row.
"""

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.notifications.services import notify

from ..models import (
    ActionTakenReport,
    Attachment,
    DepartmentAssignment,
    Feedback,
    Grievance,
    GrievanceHistory,
    GrievanceRemark,
)
from .reference import generate_reference_number

S = Grievance.Status
E = GrievanceHistory.EventType

ALLOWED_TRANSITIONS = {
    S.SUBMITTED: {S.UNDER_REVIEW},
    S.UNDER_REVIEW: {S.IN_PROGRESS},
    S.IN_PROGRESS: {S.RESOLVED},
    S.RESOLVED: {S.REOPENED},
    S.REOPENED: {S.UNDER_REVIEW, S.IN_PROGRESS},
}
REOPEN_WINDOW_DAYS = 30


class WorkflowError(APIException):
    status_code = 409
    default_detail = "This action is not allowed in the grievance's current state."
    default_code = "invalid_state"


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _lock(grievance):
    return Grievance.objects.select_for_update().get(pk=grievance.pk)


def _record(grievance, event_type, actor, remarks="", from_status="", to_status="", is_public=True):
    return GrievanceHistory.objects.create(
        grievance=grievance,
        event_type=event_type,
        from_status=from_status,
        to_status=to_status,
        changed_by=actor,
        remarks=remarks,
        is_public=is_public,
    )


def _transition(grievance, to_status, actor, remarks="", event_type=E.STATUS_CHANGED):
    from_status = grievance.status
    if to_status not in ALLOWED_TRANSITIONS.get(from_status, set()):
        raise WorkflowError(
            f"Cannot change status from {Grievance.Status(from_status).label} to {Grievance.Status(to_status).label}."
        )
    grievance.status = to_status
    fields = ["status", "updated_at"]
    if to_status == S.RESOLVED:
        grievance.resolved_at = timezone.now()
        fields.append("resolved_at")
    grievance.save(update_fields=fields)
    _record(grievance, event_type, actor, remarks, from_status, to_status)
    notify(
        grievance.citizen,
        f"Grievance {grievance.reference_number} is now {grievance.get_status_display()}",
        remarks or f"Status changed to {grievance.get_status_display()}.",
        grievance,
    )


def _cmo_admins():
    return User.objects.filter(role=User.Role.CMO_ADMIN, is_active=True)


def _require_officer_access(grievance, officer):
    if officer.role != User.Role.OFFICER or grievance.department_id != officer.department_id:
        raise PermissionDenied("This grievance is not assigned to your department.")
    if grievance.assigned_officer_id not in (None, officer.id):
        raise PermissionDenied("This grievance is assigned to another officer.")


def _save_attachments(grievance, files, user, kind, action_report=None):
    for uploaded, content_type in files:
        Attachment.objects.create(
            grievance=grievance,
            action_report=action_report,
            uploaded_by=user,
            kind=kind,
            file=uploaded,
            original_name=uploaded.name[:255],
            content_type=content_type,
            size=uploaded.size,
        )


# --------------------------------------------------------------------------- #
# citizen actions
# --------------------------------------------------------------------------- #
def create_grievance(*, citizen, data, files, ai_result=None, ai_log=None):
    """Create grievance + reference number + attachments + history atomically."""
    priority = (ai_result or {}).get("suggested_priority") or Grievance.Priority.MEDIUM
    with transaction.atomic():
        grievance = Grievance(
            citizen=citizen,
            district=data["district"],
            category=data["category"],
            subject=data["subject"],
            description=data["description"],
            priority=priority,
            priority_source=Grievance.PrioritySource.AI_SUGGESTED,
            ai_analysis=ai_result,
            ai_summary=(ai_result or {}).get("summary", ""),
            ai_suggested_department_id=(ai_result or {}).get("suggested_department_id"),
            reference_number=generate_reference_number(),
        )
        grievance.due_at = grievance.compute_due_at(timezone.now())
        grievance.save()
        _save_attachments(grievance, files, citizen, Attachment.Kind.EVIDENCE)
        _record(grievance, E.CREATED, citizen, "Grievance submitted by citizen.", "", S.SUBMITTED)
        if ai_log is not None:
            ai_log.grievance = grievance
            ai_log.save(update_fields=["grievance"])
        notify(
            _cmo_admins(),
            f"New grievance {grievance.reference_number}",
            f"{grievance.get_category_display()} - {grievance.get_district_display()}: {grievance.subject}",
            grievance,
        )
        notify(
            citizen,
            "Grievance submitted successfully",
            f"Your reference number is {grievance.reference_number}. Use it to track progress.",
            grievance,
        )
    return grievance


def submit_feedback(grievance, citizen, rating, comments, is_satisfied):
    with transaction.atomic():
        grievance = _lock(grievance)
        if grievance.citizen_id != citizen.id:
            raise PermissionDenied("You can only give feedback on your own grievance.")
        if grievance.status != S.RESOLVED:
            raise WorkflowError("Feedback can only be given after the grievance is resolved.")
        if Feedback.objects.filter(grievance=grievance, resolution_cycle=grievance.reopened_count).exists():
            raise WorkflowError("You have already submitted feedback for this resolution.")
        feedback = Feedback.objects.create(
            grievance=grievance,
            citizen=citizen,
            resolution_cycle=grievance.reopened_count,
            rating=rating,
            comments=comments,
            is_satisfied=is_satisfied,
        )
        _record(grievance, E.FEEDBACK, citizen, f"Citizen rated the resolution {rating}/5.")
    return feedback


def reopen(grievance, actor, reason):
    with transaction.atomic():
        grievance = _lock(grievance)
        if actor.role == User.Role.CITIZEN:
            if grievance.citizen_id != actor.id:
                raise PermissionDenied("You can only reopen your own grievance.")
            if grievance.resolved_at and timezone.now() - grievance.resolved_at > timedelta(days=REOPEN_WINDOW_DAYS):
                raise WorkflowError(f"Grievances can only be reopened within {REOPEN_WINDOW_DAYS} days of resolution.")
        elif actor.role != User.Role.CMO_ADMIN:
            raise PermissionDenied("Only the citizen or the CMO can reopen a grievance.")
        _transition(grievance, S.REOPENED, actor, f"Reopened: {reason}", E.REOPENED)
        grievance.reopened_count += 1
        grievance.resolved_at = None
        grievance.due_at = grievance.compute_due_at(timezone.now())
        grievance.save(update_fields=["reopened_count", "resolved_at", "due_at", "updated_at"])
        notify(_cmo_admins(), f"Grievance {grievance.reference_number} reopened", reason, grievance)
        if grievance.assigned_officer_id:
            notify(grievance.assigned_officer, f"Grievance {grievance.reference_number} reopened", reason, grievance)
    return grievance


# --------------------------------------------------------------------------- #
# CMO actions
# --------------------------------------------------------------------------- #
def start_review(grievance, actor, remarks=""):
    with transaction.atomic():
        grievance = _lock(grievance)
        if grievance.status not in (S.SUBMITTED, S.REOPENED):
            raise WorkflowError("Only submitted or reopened grievances can be moved to review.")
        _transition(grievance, S.UNDER_REVIEW, actor, remarks or "Grievance is being reviewed by the CMO.")
    return grievance


def assign(grievance, actor, department, officer=None, instructions="", remarks=""):
    if not department.is_active:
        raise ValidationError({"department": "This department is not active."})
    if officer is not None and (
        officer.role != User.Role.OFFICER or officer.department_id != department.id or not officer.is_active
    ):
        raise ValidationError({"officer": "The officer must be an active officer of the selected department."})

    with transaction.atomic():
        grievance = _lock(grievance)
        if grievance.status == S.RESOLVED:
            raise WorkflowError("A resolved grievance must be reopened before it can be reassigned.")
        if grievance.action_reports.filter(review_status=ActionTakenReport.ReviewStatus.PENDING).exists():
            raise WorkflowError("Review the pending action-taken report before reassigning.")
        if grievance.status in (S.SUBMITTED, S.REOPENED):
            _transition(grievance, S.UNDER_REVIEW, actor, "Grievance reviewed by the CMO.")

        now = timezone.now()
        grievance.assignments.filter(is_active=True).update(is_active=False, ended_at=now)
        DepartmentAssignment.objects.create(
            grievance=grievance, department=department, officer=officer, assigned_by=actor, instructions=instructions
        )
        reassigned = grievance.department_id is not None
        grievance.department = department
        grievance.assigned_officer = officer
        fields = ["department", "assigned_officer", "updated_at"]
        if grievance.status == S.IN_PROGRESS:
            # A reassigned case goes back to the new team for (re)investigation.
            grievance.status = S.UNDER_REVIEW
            fields.append("status")
            _record(grievance, E.STATUS_CHANGED, actor, "Reassigned; awaiting new investigation.", S.IN_PROGRESS, S.UNDER_REVIEW)
        grievance.save(update_fields=fields)

        _record(grievance, E.ASSIGNED, actor, remarks or f"{'Reassigned' if reassigned else 'Forwarded'} to {department.name}.")
        recipients = [officer] if officer else list(department.officers.filter(is_active=True))
        notify(recipients, f"New grievance assigned: {grievance.reference_number}", instructions or grievance.subject, grievance)
        notify(grievance.citizen, f"Grievance {grievance.reference_number} forwarded", f"Your grievance has been forwarded to {department.name}.", grievance)
    return grievance


def escalate(grievance, actor, reason):
    with transaction.atomic():
        grievance = _lock(grievance)
        if grievance.status == S.RESOLVED:
            raise WorkflowError("Resolved grievances cannot be escalated.")
        grievance.is_escalated = True
        grievance.escalated_at = timezone.now()
        grievance.priority = Grievance.Priority.HIGH
        grievance.priority_source = Grievance.PrioritySource.CMO_CONFIRMED
        grievance.save(update_fields=["is_escalated", "escalated_at", "priority", "priority_source", "updated_at"])
        _record(grievance, E.ESCALATED, actor, f"Escalated by CMO: {reason}", is_public=False)
        recipients = [grievance.assigned_officer] if grievance.assigned_officer_id else (
            list(grievance.department.officers.filter(is_active=True)) if grievance.department_id else []
        )
        notify(recipients, f"ESCALATED: {grievance.reference_number}", reason, grievance)
    return grievance


def update_triage(grievance, actor, priority=None, category=None):
    """CMO confirms/overrides the AI-suggested priority and/or the category."""
    with transaction.atomic():
        grievance = _lock(grievance)
        changes = []
        if priority and priority != grievance.priority:
            changes.append(f"priority {grievance.get_priority_display()} -> {Grievance.Priority(priority).label}")
            grievance.priority = priority
            grievance.due_at = grievance.compute_due_at(grievance.created_at)
        if category and category != grievance.category:
            changes.append(f"category {grievance.get_category_display()} -> {category}")
            grievance.category = category
        grievance.priority_source = Grievance.PrioritySource.CMO_CONFIRMED
        grievance.save(update_fields=["priority", "category", "priority_source", "due_at", "updated_at"])
        _record(
            grievance, E.TRIAGE_UPDATED, actor,
            "CMO updated " + ", ".join(changes) if changes else "CMO confirmed the AI-suggested priority.",
            is_public=False,
        )
    return grievance


def review_action_report(report, reviewer, approve, remarks):
    """Only the CMO can approve (-> RESOLVED) or reject (request additional action)."""
    if reviewer.role != User.Role.CMO_ADMIN:
        raise PermissionDenied("Only CMO administrators can review action-taken reports.")
    with transaction.atomic():
        report = ActionTakenReport.objects.select_for_update().get(pk=report.pk)
        grievance = _lock(report.grievance)
        if report.review_status != ActionTakenReport.ReviewStatus.PENDING:
            raise WorkflowError("This report has already been reviewed.")
        report.review_status = (
            ActionTakenReport.ReviewStatus.APPROVED if approve else ActionTakenReport.ReviewStatus.REJECTED
        )
        report.reviewed_by = reviewer
        report.review_remarks = remarks
        report.reviewed_at = timezone.now()
        report.save(update_fields=["review_status", "reviewed_by", "review_remarks", "reviewed_at", "updated_at"])

        if approve:
            _record(grievance, E.REPORT_APPROVED, reviewer, remarks or "Action-taken report approved by the CMO.", is_public=False)
            _transition(grievance, S.RESOLVED, reviewer, f"Resolved. {report.resolution_details}")
            notify(report.officer, f"Report approved: {grievance.reference_number}", remarks or "The CMO approved your report.", grievance)
        else:
            _record(grievance, E.REPORT_REJECTED, reviewer, f"CMO requested additional action: {remarks}")
            notify(report.officer, f"Additional action requested: {grievance.reference_number}", remarks, grievance)
            notify(grievance.citizen, f"Update on {grievance.reference_number}", "The CMO has requested further action from the department.", grievance)
    return report


# --------------------------------------------------------------------------- #
# Officer actions
# --------------------------------------------------------------------------- #
def start_investigation(grievance, officer, remarks=""):
    with transaction.atomic():
        grievance = _lock(grievance)
        _require_officer_access(grievance, officer)
        _transition(grievance, S.IN_PROGRESS, officer, remarks or "Investigation started by the department.")
    return grievance


def add_progress_update(grievance, officer, remarks):
    with transaction.atomic():
        grievance = _lock(grievance)
        _require_officer_access(grievance, officer)
        if grievance.status != S.IN_PROGRESS:
            raise WorkflowError("Progress can only be updated while the grievance is In Progress.")
        _record(grievance, E.PROGRESS_UPDATE, officer, remarks)
        grievance.save(update_fields=["updated_at"])
        notify(grievance.citizen, f"Progress update on {grievance.reference_number}", remarks, grievance)
    return grievance


def submit_action_report(grievance, officer, action_taken, resolution_details, files):
    with transaction.atomic():
        grievance = _lock(grievance)
        _require_officer_access(grievance, officer)
        if grievance.status != S.IN_PROGRESS:
            raise WorkflowError("An action-taken report can only be submitted while the grievance is In Progress.")
        if grievance.action_reports.filter(review_status=ActionTakenReport.ReviewStatus.PENDING).exists():
            raise WorkflowError("A report is already awaiting CMO review.")
        report = ActionTakenReport.objects.create(
            grievance=grievance,
            assignment=grievance.assignments.filter(is_active=True).first(),
            officer=officer,
            action_taken=action_taken,
            resolution_details=resolution_details,
        )
        _save_attachments(grievance, files, officer, Attachment.Kind.ACTION_REPORT, report)
        _record(grievance, E.REPORT_SUBMITTED, officer, "Action-taken report submitted to the CMO for review.")
        grievance.save(update_fields=["updated_at"])
        notify(_cmo_admins(), f"Action-taken report: {grievance.reference_number}", "A report is awaiting your review.", grievance)
    return report


# --------------------------------------------------------------------------- #
# Shared
# --------------------------------------------------------------------------- #
def add_remark(grievance, author, text, visibility):
    if author.role == User.Role.OFFICER:
        _require_officer_access(grievance, author)
    elif author.role != User.Role.CMO_ADMIN:
        raise PermissionDenied("Only staff can add remarks.")
    remark = GrievanceRemark.objects.create(grievance=grievance, author=author, text=text, visibility=visibility)
    if visibility == GrievanceRemark.Visibility.PUBLIC:
        notify(grievance.citizen, f"New remark on {grievance.reference_number}", text[:300], grievance)
    return remark
