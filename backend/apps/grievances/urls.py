"""URL routing for grievance-related endpoints, grouped by actor."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .views.attachments import AttachmentDownloadView
from .views.citizen import CitizenGrievanceViewSet, TrackGrievanceView
from .views.cmo import CMOActionReportViewSet, CMODashboardView, CMOGrievanceViewSet
from .views.officer import OfficerDashboardView, OfficerGrievanceViewSet

citizen_router = DefaultRouter(trailing_slash=True)
citizen_router.include_root_view = False
citizen_router.register("", CitizenGrievanceViewSet, basename="citizen-grievance")

cmo_router = DefaultRouter()
cmo_router.include_root_view = False
cmo_router.register("grievances", CMOGrievanceViewSet, basename="cmo-grievance")
cmo_router.register("reports", CMOActionReportViewSet, basename="cmo-report")

officer_router = DefaultRouter()
officer_router.include_root_view = False
officer_router.register("grievances", OfficerGrievanceViewSet, basename="officer-grievance")

citizen_urlpatterns = [
    path("track/<str:reference_number>/", TrackGrievanceView.as_view(), name="grievance-track"),
] + citizen_router.urls

cmo_urlpatterns = [
    path("dashboard/", CMODashboardView.as_view(), name="cmo-dashboard"),
] + cmo_router.urls

officer_urlpatterns = [
    path("dashboard/", OfficerDashboardView.as_view(), name="officer-dashboard"),
] + officer_router.urls

attachment_urlpatterns = [
    path("<int:pk>/download/", AttachmentDownloadView.as_view(), name="attachment-download"),
]
