import django_filters
from django.db.models import Q
from django.utils import timezone

from apps.core.choices import Category, District

from .models import ActionTakenReport, Grievance


class GrievanceFilter(django_filters.FilterSet):
    status = django_filters.MultipleChoiceFilter(choices=Grievance.Status.choices)
    district = django_filters.ChoiceFilter(choices=District.choices)
    category = django_filters.ChoiceFilter(choices=Category.choices)
    priority = django_filters.ChoiceFilter(choices=Grievance.Priority.choices)
    department = django_filters.NumberFilter(field_name="department_id")
    unassigned = django_filters.BooleanFilter(method="filter_unassigned")
    is_escalated = django_filters.BooleanFilter()
    overdue = django_filters.BooleanFilter(method="filter_overdue")
    created_after = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    created_before = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = Grievance
        fields = ["status", "district", "category", "priority", "department", "is_escalated"]

    def filter_overdue(self, queryset, name, value):
        cond = Q(due_at__lt=timezone.now()) & ~Q(status=Grievance.Status.RESOLVED)
        return queryset.filter(cond) if value else queryset.exclude(cond)

    def filter_unassigned(self, queryset, name, value):
        return queryset.filter(department__isnull=value)


class ActionReportFilter(django_filters.FilterSet):
    review_status = django_filters.ChoiceFilter(choices=ActionTakenReport.ReviewStatus.choices)

    class Meta:
        model = ActionTakenReport
        fields = ["review_status"]
