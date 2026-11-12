from django.contrib import admin

from .models import (
    ActionTakenReport,
    Attachment,
    DepartmentAssignment,
    Feedback,
    Grievance,
    GrievanceHistory,
    GrievanceRemark,
)


class HistoryInline(admin.TabularInline):
    model = GrievanceHistory
    extra = 0
    can_delete = False
    readonly_fields = ("event_type", "from_status", "to_status", "changed_by", "remarks", "is_public", "created_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Grievance)
class GrievanceAdmin(admin.ModelAdmin):
    """Read-mostly: workflow changes must go through the API so history is always recorded."""

    list_display = ("reference_number", "subject", "district", "category", "status", "priority", "department", "created_at")
    list_filter = ("status", "priority", "district", "category", "department", "is_escalated")
    search_fields = ("reference_number", "subject", "citizen__email")
    readonly_fields = [f.name for f in Grievance._meta.fields]
    inlines = [HistoryInline]

    def has_add_permission(self, request):
        return False


@admin.register(GrievanceHistory)
class GrievanceHistoryAdmin(admin.ModelAdmin):
    list_display = ("grievance", "event_type", "from_status", "to_status", "changed_by", "created_at")
    list_filter = ("event_type",)
    readonly_fields = [f.name for f in GrievanceHistory._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in (DepartmentAssignment, ActionTakenReport, Attachment, GrievanceRemark, Feedback):
    admin.site.register(model)
