from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.core.permissions import HasRole

from .serializers import AnalyseRequestSerializer
from .services.analysis import analyse_grievance, citizen_view_of


class CanUseAIAssistant(HasRole):
    allowed_roles = (User.Role.CITIZEN, User.Role.CMO_ADMIN)


class AnalyseGrievanceView(APIView):
    """POST /api/v1/ai/analyse/ - advisory analysis of a complaint description."""

    permission_classes = [CanUseAIAssistant]
    throttle_scope = "ai"

    def post(self, request):
        serializer = AnalyseRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result, _ = analyse_grievance(user=request.user, **serializer.validated_data)
        if request.user.role == User.Role.CITIZEN:
            result = citizen_view_of(result, request.user)
        return Response(result)
