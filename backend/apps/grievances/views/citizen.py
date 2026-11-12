from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_assistant.services.analysis import analyse_grievance, get_reusable_analysis
from apps.core.permissions import IsCitizen

from ..models import Grievance
from ..serializers.citizen import CitizenGrievanceDetailSerializer, GrievanceCreateSerializer, PublicTrackSerializer
from ..serializers.common import (
    CitizenHistorySerializer,
    FeedbackCreateSerializer,
    FeedbackSerializer,
    GrievanceListSerializer,
    ReasonSerializer,
)
from ..services import workflow
from ..services.selectors import citizen_grievances
from ..services.stats import citizen_stats

REFERENCE_REGEX = r"CMK-\d{4}-\d{5,}"


class CitizenGrievanceViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """/api/v1/grievances/ - a citizen's own grievances only (object-level isolation via queryset)."""

    permission_classes = [IsCitizen]
    lookup_field = "reference_number"
    lookup_value_regex = REFERENCE_REGEX
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = ("status", "category", "district")
    search_fields = ("reference_number", "subject")
    ordering_fields = ("created_at", "updated_at", "status")

    def get_queryset(self):
        return citizen_grievances(self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return GrievanceCreateSerializer
        if self.action == "retrieve":
            return CitizenGrievanceDetailSerializer
        return GrievanceListSerializer

    def create(self, request, *args, **kwargs):
        serializer = GrievanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # AI analysis runs BEFORE the DB transaction (network call). Reuse the citizen's
        # earlier analysis of the same text if available, otherwise analyse now.
        reused = get_reusable_analysis(data.get("ai_analysis_id"), request.user, data["description"])
        ai_result, ai_log = reused or analyse_grievance(
            description=data["description"], subject=data["subject"], district=data["district"], user=request.user
        )
        grievance = workflow.create_grievance(
            citizen=request.user, data=data, files=data["attachments"], ai_result=ai_result, ai_log=ai_log
        )
        grievance = self.get_queryset().get(pk=grievance.pk)
        return Response(CitizenGrievanceDetailSerializer(grievance).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        recent = GrievanceListSerializer(qs[:5], many=True).data
        return Response({"totals": citizen_stats(qs), "recent": recent})

    @action(detail=True, methods=["get"])
    def history(self, request, reference_number=None):
        grievance = self.get_object()
        qs = grievance.history.filter(is_public=True).select_related("changed_by")
        return Response(CitizenHistorySerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def feedback(self, request, reference_number=None):
        grievance = self.get_object()
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fb = workflow.submit_feedback(grievance, request.user, **serializer.validated_data)
        return Response(FeedbackSerializer(fb).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def reopen(self, request, reference_number=None):
        grievance = self.get_object()
        serializer = ReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workflow.reopen(grievance, request.user, serializer.validated_data["reason"])
        return Response(CitizenGrievanceDetailSerializer(self.get_object()).data)


class TrackGrievanceView(APIView):
    """GET /api/v1/grievances/track/<reference>/ - public, rate-limited, no personal data."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "track"

    def get(self, request, reference_number):
        grievance = get_object_or_404(
            Grievance.objects.select_related("department"), reference_number=reference_number.upper().strip()
        )
        return Response(PublicTrackSerializer(grievance).data)
