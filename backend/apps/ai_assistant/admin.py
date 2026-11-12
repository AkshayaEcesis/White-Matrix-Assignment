from django.contrib import admin

from .models import AIAnalysisLog


@admin.register(AIAnalysisLog)
class AIAnalysisLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "source", "model_name", "success", "latency_ms", "grievance")
    list_filter = ("source", "success")
    readonly_fields = [f.name for f in AIAnalysisLog._meta.fields]
