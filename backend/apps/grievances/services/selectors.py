"""Role-scoped querysets. Object-level authorization starts here: users only ever query rows they may see."""

from django.db.models import Case, IntegerField, Q, Value, When

from apps.accounts.models import User

from ..models import Grievance

PRIORITY_RANK = Case(
    When(priority=Grievance.Priority.HIGH, then=Value(3)),
    When(priority=Grievance.Priority.MEDIUM, then=Value(2)),
    default=Value(1),
    output_field=IntegerField(),
)


def base_queryset():
    return Grievance.objects.select_related("department", "assigned_officer", "citizen").annotate(
        priority_rank=PRIORITY_RANK
    )


def citizen_grievances(user):
    return base_queryset().filter(citizen=user)


def officer_grievances(user):
    """Officers see only grievances routed to THEIR department, assigned to them or to the department pool."""
    if user.role != User.Role.OFFICER or not user.department_id:
        return Grievance.objects.none()
    return base_queryset().filter(department_id=user.department_id).filter(
        Q(assigned_officer=user) | Q(assigned_officer__isnull=True)
    )


def cmo_grievances():
    return base_queryset()


def grievances_visible_to(user):
    if user.role == User.Role.CMO_ADMIN:
        return cmo_grievances()
    if user.role == User.Role.OFFICER:
        return officer_grievances(user)
    return citizen_grievances(user)
