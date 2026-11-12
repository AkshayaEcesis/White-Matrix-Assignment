"""Shared fixtures for API tests."""

import io
import tempfile

from django.core.cache import cache
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.accounts.tokens import issue_tokens
from apps.departments.models import Department

PASSWORD = "Str0ng!Passw0rd"
FALLBACK_RESULT_PATCH = "apps.ai_assistant.services.analysis.call_gemini"


def png_file(name="evidence.png"):
    buf = io.BytesIO()
    Image.new("RGB", (4, 4), "green").save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp(prefix="cmk-test-media-"))
class APIBase(APITestCase):
    def setUp(self):
        cache.clear()  # reset rate-limit counters between tests
        self.water = Department.objects.create(name="Water Resources Department", code="WRD", description="Water supply")
        self.roads = Department.objects.create(name="Public Works Department", code="PWD", description="Roads")
        self.citizen = User.objects.create_user("citizen@test.local", PASSWORD, full_name="Test Citizen", mobile="9876543210")
        self.other_citizen = User.objects.create_user("other@test.local", PASSWORD, full_name="Other Citizen", mobile="9876543211")
        self.cmo = User.objects.create_user("cmo@test.local", PASSWORD, full_name="CMO Admin", role=User.Role.CMO_ADMIN)
        self.officer = User.objects.create_user(
            "officer@test.local", PASSWORD, full_name="Water Officer", role=User.Role.OFFICER, department=self.water
        )
        self.other_officer = User.objects.create_user(
            "roads@test.local", PASSWORD, full_name="Roads Officer", role=User.Role.OFFICER, department=self.roads
        )

    def as_user(self, user):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {issue_tokens(user).access_token}")

    def logout_client(self):
        self.client.credentials()

    def grievance_payload(self, **overrides):
        data = {
            "district": "ERNAKULAM",
            "category": "WATER_SUPPLY",
            "subject": "No water supply for a week",
            "description": "There has been no piped drinking water supply in our ward for seven days now.",
        }
        data.update(overrides)
        return data
