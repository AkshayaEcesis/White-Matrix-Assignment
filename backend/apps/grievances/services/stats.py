"""Dashboard statistics computed from stored data with database aggregation."""

from datetime import timedelta

from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

from apps.core.choices import Category, District
from apps.departments.models import Department

from ..models import ActionTakenReport, Grievance

S = Grievance.Status


def _counts(qs):
    now = timezone.now()
    return qs.aggregate(
        total=Count("id"),
        submitted=Count("id", filter=Q(status=S.SUBMITTED)),
        under_review=Count("id", filter=Q(status=S.UNDER_REVIEW)),
        in_progress=Count("id", filter=Q(status=S.IN_PROGRESS)),
        resolved=Count("id", filter=Q(status=S.RESOLVED)),
        reopened=Count("id", filter=Q(status=S.REOPENED)),
        pending=Count("id", filter=~Q(status=S.RESOLVED)),
        overdue=Count("id", filter=~Q(status=S.RESOLVED) & Q(due_at__lt=now)),
        escalated=Count("id", filter=Q(is_escalated=True) & ~Q(status=S.RESOLVED)),
        high_priority=Count("id", filter=Q(priority=Grievance.Priority.HIGH) & ~Q(status=S.RESOLVED)),
    )


def _avg_resolution_days(qs):
    rows = list(qs.filter(status=S.RESOLVED, resolved_at__isnull=False).values_list("created_at", "resolved_at")[:1000])
    if not rows:
        return None
    total = sum((resolved - created).total_seconds() for created, resolved in rows)
    return round(total / len(rows) / 86400, 1)


def cmo_stats():
    qs = Grievance.objects.all()
    now = timezone.now()
    district_labels = dict(District.choices)
    category_labels = dict(Category.choices)

    by_district = {
        row["district"]: row
        for row in qs.values("district").annotate(
            total=Count("id"),
            resolved=Count("id", filter=Q(status=S.RESOLVED)),
            pending=Count("id", filter=~Q(status=S.RESOLVED)),
            overdue=Count("id", filter=~Q(status=S.RESOLVED) & Q(due_at__lt=now)),
        )
    }
    districts = [
        {
            "district": code,
            "label": label,
            "total": by_district.get(code, {}).get("total", 0),
            "resolved": by_district.get(code, {}).get("resolved", 0),
            "pending": by_district.get(code, {}).get("pending", 0),
            "overdue": by_district.get(code, {}).get("overdue", 0),
        }
        for code, label in district_labels.items()
    ]

    departments = list(
        Department.objects.filter(is_active=True)
        .annotate(
            total=Count("grievances"),
            resolved=Count("grievances", filter=Q(grievances__status=S.RESOLVED)),
            pending=Count("grievances", filter=~Q(grievances__status=S.RESOLVED)),
            overdue=Count("grievances", filter=~Q(grievances__status=S.RESOLVED) & Q(grievances__due_at__lt=now)),
        )
        .values("id", "name", "code", "total", "resolved", "pending", "overdue")
        .order_by("-total", "name")
    )
    unassigned = qs.filter(department__isnull=True).exclude(status=S.RESOLVED).count()

    six_months_ago = (now - timedelta(days=180)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    trend = [
        {"month": row["month"].strftime("%b %Y"), "submitted": row["submitted"], "resolved": row["resolved"]}
        for row in qs.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(submitted=Count("id"), resolved=Count("id", filter=Q(status=S.RESOLVED)))
        .order_by("month")
    ]

    return {
        "totals": {
            **_counts(qs),
            "pending_reports": ActionTakenReport.objects.filter(review_status=ActionTakenReport.ReviewStatus.PENDING).count(),
            "unassigned": unassigned,
            "avg_resolution_days": _avg_resolution_days(qs),
        },
        "by_status": [
            {"status": code, "label": label, "count": qs.filter(status=code).count()} for code, label in S.choices
        ],
        "by_priority": [
            {"priority": code, "label": label, "count": qs.filter(priority=code).exclude(status=S.RESOLVED).count()}
            for code, label in Grievance.Priority.choices
        ],
        "by_category": [
            {"category": row["category"], "label": category_labels.get(row["category"], row["category"]), "count": row["count"]}
            for row in qs.values("category").annotate(count=Count("id")).order_by("-count")
        ],
        "by_district": districts,
        "by_department": departments,
        "monthly_trend": trend,
    }


def officer_stats(queryset):
    counts = _counts(queryset)
    counts["pending_reports"] = ActionTakenReport.objects.filter(
        grievance__in=queryset, review_status=ActionTakenReport.ReviewStatus.PENDING
    ).count()
    counts["awaiting_action"] = queryset.filter(status__in=[S.UNDER_REVIEW, S.REOPENED]).count()
    return counts


def citizen_stats(queryset):
    return _counts(queryset)


def public_stats():
    counts = Grievance.objects.aggregate(
        total=Count("id"),
        resolved=Count("id", filter=Q(status=S.RESOLVED)),
        in_progress=Count("id", filter=Q(status__in=[S.UNDER_REVIEW, S.IN_PROGRESS])),
    )
    total = counts["total"] or 0
    return {
        **counts,
        "departments": Department.objects.filter(is_active=True).count(),
        "districts": len(District.choices),
        "resolution_rate": round(counts["resolved"] * 100 / total) if total else 0,
        "avg_resolution_days": _avg_resolution_days(Grievance.objects.all()),
    }
