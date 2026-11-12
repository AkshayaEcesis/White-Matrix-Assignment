from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsOfficer

from ..filters import GrievanceFilter
from ..serializers.common import (
    ActionReportSerializer,
    OptionalRemarksSerializer,
    RemarkCreateSerializer,
    RemarkSerializer,
    RequiredRemarksSerializer,
    StaffGrievanceListSerializer,
)
from ..serializers.staff import ActionReportCreateSerializer, StaffGrievanceDetailSerializer
from ..services import workflow
from ..services.selectors import officer_grievances
from ..services.stats import officer_stats
from .citizen import REFERENCE_REGEX


class OfficerGrievanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/v1/officer/grievances/ - only grievances routed to the officer's department
    (assigned to them or to the department pool). Any other reference returns 404.
    """

    permission_classes = [IsOfficer]
    lookup_field = "reference_number"
    lookup_value_regex = REFERENCE_REGEX
    filterset_class = GrievanceFilter
    search_fields = ("reference_number", "subject")
    ordering_fields = ("created_at", "updated_at", "due_at", "priority_rank")
    ordering = ("-is_escalated", "due_at")
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return officer_grievances(self.request.user)

    def get_serializer_class(self):
        return StaffGrievanceDetailSerializer if self.action != "list" else StaffGrievanceListSerializer

    def _detail(self):
        return Response(StaffGrievanceDetailSerializer(self.get_object()).data)

    @action(detail=True, methods=["post"], url_path="start-investigation")
    def start_investigation(self, request, reference_number=None):
        s = OptionalRemarksSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.start_investigation(self.get_object(), request.user, s.validated_data["remarks"])
        return self._detail()

    @action(detail=True, methods=["post"])
    def progress(self, request, reference_number=None):
        s = RequiredRemarksSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.add_progress_update(self.get_object(), request.user, s.validated_data["remarks"])
        return self._detail()

    @action(detail=True, methods=["get", "post"])
    def remarks(self, request, reference_number=None):
        grievance = self.get_object()
        if request.method == "POST":
            s = RemarkCreateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            remark = workflow.add_remark(grievance, request.user, **s.validated_data)
            return Response(RemarkSerializer(remark).data, status=status.HTTP_201_CREATED)
        return Response(RemarkSerializer(grievance.remarks.select_related("author"), many=True).data)

    @action(detail=True, methods=["get", "post"])
    def reports(self, request, reference_number=None):
        grievance = self.get_object()
        if request.method == "POST":
            s = ActionReportCreateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            report = workflow.submit_action_report(
                grievance, request.user, s.validated_data["action_taken"],
                s.validated_data["resolution_details"], s.validated_data["attachments"],
            )
            return Response(ActionReportSerializer(report).data, status=status.HTTP_201_CREATED)
        return Response(ActionReportSerializer(grievance.action_reports.all(), many=True).data)


class OfficerDashboardView(APIView):
    permission_classes = [IsOfficer]

    def get(self, request):
        qs = officer_grievances(request.user)
        recent = StaffGrievanceListSerializer(qs.order_by("-updated_at")[:5], many=True).data
        return Response({"totals": officer_stats(qs), "recent": recent, "department": request.user.department.name})
