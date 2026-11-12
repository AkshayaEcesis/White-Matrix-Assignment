from django.conf import settings
from django.contrib import admin
from django.urls import include, path

from apps.core.views import ChoicesView, HealthView, PublicStatsView
from apps.grievances.urls import (
    attachment_urlpatterns,
    citizen_urlpatterns,
    cmo_urlpatterns,
    officer_urlpatterns,
)

api_v1 = [
    path("health/", HealthView.as_view(), name="health"),
    path("meta/choices/", ChoicesView.as_view(), name="meta-choices"),
    path("public/stats/", PublicStatsView.as_view(), name="public-stats"),
    path("auth/", include("apps.accounts.urls")),
    path("departments/", include("apps.departments.urls")),
    path("grievances/", include(citizen_urlpatterns)),
    path("cmo/", include(cmo_urlpatterns)),
    path("officer/", include(officer_urlpatterns)),
    path("attachments/", include(attachment_urlpatterns)),
    path("ai/", include("apps.ai_assistant.urls")),
    path("contact/", include("apps.contact.urls")),
    path("notifications/", include("apps.notifications.urls")),
]

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/v1/", include(api_v1)),
]

admin.site.site_header = "CM Kerala Grievance Portal - Administration (Recruitment Prototype)"
admin.site.site_title = "CM Grievance Admin"
