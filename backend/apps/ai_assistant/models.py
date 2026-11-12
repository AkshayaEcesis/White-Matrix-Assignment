from django.conf import settings
from django.db import models


class AIAnalysisLog(models.Model):
    """Audit log of every AI analysis request (successful Gemini calls and labelled fallbacks)."""

    class Source(models.TextChoices):
        GEMINI = "GEMINI", "Google Gemini"
        FALLBACK = "FALLBACK", "Rule-based fallback (not AI)"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")
    grievance = models.ForeignKey(
        "grievances.Grievance", on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_logs"
    )
    input_hash = models.CharField(max_length=64, db_index=True)
    source = models.CharField(max_length=10, choices=Source.choices)
    model_name = models.CharField(max_length=80, blank=True)
    success = models.BooleanField(default=False)
    result = models.JSONField(null=True, blank=True)
    error_message = models.CharField(max_length=300, blank=True)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.source} ({'ok' if self.success else 'failed'}) @ {self.created_at:%Y-%m-%d %H:%M}"
