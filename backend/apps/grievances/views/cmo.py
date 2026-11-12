from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsCMOAdmin

from ..filters import ActionReportFilter, GrievanceFilter
from ..models import ActionTakenReport
from ..serializers.common import (
    ActionReportSerializer,
    HistorySerializer,
    OptionalRemarksSerializer,
    ReasonSerializer,
    RemarkCreateSerializer,
    RemarkSerializer,
    StaffGrievanceListSerializer,
)
from ..serializers.staff import AssignSerializer, ReportReviewSerializer, StaffGrievanceDetailSerializer, TriageSerializer
from ..services import workflow
from ..services.selectors import cmo_grievances
from ..services.stats import cmo_stats
from .citizen import REFERENCE_REGEX


class CMOGrievanceViewSet(viewsets.ReadOnlyModelViewSet):
    """/api/v1/cmo/grievances/ - all grievances with search, filtering and CMO workflow actions."""

    permission_classes = [IsCMOAdmin]
    lookup_field = "reference_number"
    lookup_value_regex = REFERENCE_REGEX
    filterset_class = GrievanceFilter
    search_fields = ("reference_number", "subject", "description", "citizen__full_name", "citizen__email")
    ordering_fields = ("created_at", "updated_at", "due_at", "priority_rank", "status")
    ordering = ("-created_at",)

    def get_queryset(self):
        return cmo_grievances()

    def get_serializer_class(self):
        return StaffGrievanceDetailSerializer if self.action != "list" else StaffGrievanceListSerializer

    def _detail(self):
        return Response(StaffGrievanceDetailSerializer(self.get_object()).data)

    @action(detail=True, methods=["post"], url_path="start-review")
    def start_review(self, request, reference_number=None):
        s = OptionalRemarksSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.start_review(self.get_object(), request.user, s.validated_data["remarks"])
        return self._detail()

    @action(detail=True, methods=["post"])
    def assign(self, request, reference_number=None):
        s = AssignSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.assign(
            self.get_object(), request.user, s.validated_data["department"],
            s.validated_data.get("officer"), s.validated_data["instructions"],
        )
        return self._detail()

    @action(detail=True, methods=["post"])
    def escalate(self, request, reference_number=None):
        s = ReasonSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.escalate(self.get_object(), request.user, s.validated_data["reason"])
        return self._detail()

    @action(detail=True, methods=["post"])
    def triage(self, request, reference_number=None):
        s = TriageSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.update_triage(self.get_object(), request.user, **s.validated_data)
        return self._detail()

    @action(detail=True, methods=["post"])
    def reopen(self, request, reference_number=None):
        s = ReasonSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        workflow.reopen(self.get_object(), request.user, s.validated_data["reason"])
        return self._detail()

    @action(detail=True, methods=["get", "post"])
    def remarks(self, request, reference_number=None):
        grievance = self.get_object()
        if request.method == "POST":
            s = RemarkCreateSerializer(data=request.data)
            s.is_valid(raise_exception=True)
            remark = workflow.add_remark(grievance, request.user, **s.validated_data)
            return Response(RemarkSerializer(remark).data, status=201)
        return Response(RemarkSerializer(grievance.remarks.select_related("author"), many=True).data)

    @action(detail=True, methods=["get"])
    def history(self, request, reference_number=None):
        return Response(HistorySerializer(self.get_object().history.select_related("changed_by"), many=True).data)


class CMOActionReportViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/v1/cmo/reports/ - action-taken reports awaiting / after CMO review."""

    permission_classes = [IsCMOAdmin]
    serializer_class = ActionReportSerializer
    filterset_class = ActionReportFilter
    search_fields = ("grievance__reference_number", "grievance__subject")

    def get_queryset(self):
        return ActionTakenReport.objects.select_related(
            "grievance", "grievance__department", "officer", "reviewed_by"
        ).prefetch_related("attachments")

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        s = ReportReviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        report = workflow.review_action_report(
            self.get_object(), request.user, s.validated_data["decision"] == "APPROVE", s.validated_data["remarks"]
        )
        return Response(ActionReportSerializer(report).data)


class CMODashboardView(APIView):
    permission_classes = [IsCMOAdmin]

    def get(self, request):
        return Response(cmo_stats())
