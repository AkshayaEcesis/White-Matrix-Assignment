from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Department
from .serializers import DepartmentSerializer


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Public, read-only list of active departments."""

    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    search_fields = ("name", "description")
