from django.db import models

from apps.core.models import TimeStampedModel


class Department(TimeStampedModel):
    """A (fictional, demonstration) government department that handles grievances."""

    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=10, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=40, default="building-2", help_text="Lucide icon name for the UI.")
    contact_email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
