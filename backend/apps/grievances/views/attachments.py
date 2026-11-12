from django.http import FileResponse, Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from ..models import Attachment
from ..services.selectors import grievances_visible_to


class AttachmentDownloadView(APIView):
    """
    Stream an attachment only if the requester may see its grievance.
    Files are never exposed through public URLs, so this check cannot be bypassed.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        attachment = Attachment.objects.filter(
            pk=pk, grievance__in=grievances_visible_to(request.user).values("pk")
        ).first()
        if attachment is None:
            raise Http404
        try:
            handle = attachment.file.open("rb")
        except FileNotFoundError:
            raise Http404
        response = FileResponse(
            handle, as_attachment=True, filename=attachment.original_name, content_type=attachment.content_type
        )
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response
