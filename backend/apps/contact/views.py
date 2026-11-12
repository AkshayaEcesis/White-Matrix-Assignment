from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.permissions import IsCMOAdmin

from .models import ContactEnquiry
from .serializers import ContactEnquirySerializer


class ContactEnquiryViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """POST is public (rate-limited); listing/reviewing enquiries is CMO-only."""

    serializer_class = ContactEnquirySerializer
    queryset = ContactEnquiry.objects.all()
    filterset_fields = ("is_reviewed",)
    search_fields = ("name", "email", "subject")

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsCMOAdmin()]

    def get_authenticators(self):
        # Public form: do not fail on a stale/expired bearer token.
        if self.action_map.get(self.request.method.lower()) == "create":
            return []
        return super().get_authenticators()

    def get_throttles(self):
        if self.action == "create":
            self.throttle_scope = "contact"
        return super().get_throttles()

    @action(detail=True, methods=["post"], url_path="mark-reviewed")
    def mark_reviewed(self, request, pk=None):
        enquiry = self.get_object()
        enquiry.is_reviewed = True
        enquiry.save(update_fields=["is_reviewed"])
        return Response(self.get_serializer(enquiry).data)
