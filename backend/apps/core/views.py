from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.grievances.models import Grievance
from apps.grievances.services.stats import public_stats

from .choices import Category, District, choices_payload


class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({"status": "ok", "service": "cm-kerala-grievance-api"})


class ChoicesView(APIView):
    """Dropdown values for the frontend so choice lists are defined only once (here)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "districts": choices_payload(District),
                "categories": choices_payload(Category),
                "statuses": choices_payload(Grievance.Status),
                "priorities": choices_payload(Grievance.Priority),
            }
        )


class PublicStatsView(APIView):
    """Aggregate, non-personal statistics for the public home page."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response(public_stats())
