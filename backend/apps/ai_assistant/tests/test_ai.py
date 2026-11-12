from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import override_settings

from apps.ai_assistant.models import AIAnalysisLog
from apps.ai_assistant.services.gemini import AIServiceError, GeminiAnalysis, call_gemini
from apps.core.tests.base import FALLBACK_RESULT_PATCH, APIBase

URL = "/api/v1/ai/analyse/"
TEXT = "There is no drinking water supply in our ward for the last five days and children are falling sick."


def gemini_ok(**overrides):
    data = {
        "suggested_department": "Water Resources Department",
        "suggested_category": "WATER_SUPPLY",
        "suggested_priority": "HIGH",
        "summary": "Citizen reports no drinking water for five days.",
        "duplicate_warning": False,
        "duplicate_reference": "",
        "reasoning": "Water supply outage affecting children.",
    }
    data.update(overrides)
    return GeminiAnalysis(**data), 420


class AIEndpointTests(APIBase):
    def test_requires_authentication(self):
        self.assertEqual(self.client.post(URL, {"description": TEXT}, format="json").status_code, 401)

    def test_officer_cannot_use_assistant(self):
        self.as_user(self.officer)
        self.assertEqual(self.client.post(URL, {"description": TEXT}, format="json").status_code, 403)

    def test_rejects_short_description(self):
        self.as_user(self.citizen)
        self.assertEqual(self.client.post(URL, {"description": "short"}, format="json").status_code, 400)

    @patch(FALLBACK_RESULT_PATCH, return_value=gemini_ok())
    def test_successful_gemini_analysis(self, _):
        self.as_user(self.citizen)
        res = self.client.post(URL, {"description": TEXT, "district": "KOLLAM"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["source"], "GEMINI")
        self.assertTrue(res.data["ai_available"])
        self.assertEqual(res.data["suggested_department_id"], self.water.id)
        self.assertEqual(res.data["suggested_priority"], "HIGH")
        self.assertIn("advisory", res.data["notice"])
        self.assertTrue(AIAnalysisLog.objects.filter(source="GEMINI", success=True).exists())

    @patch(FALLBACK_RESULT_PATCH, return_value=gemini_ok(suggested_department="Ministry of Magic", suggested_category="DRAGONS", suggested_priority="URGENT"))
    def test_invalid_model_values_are_sanitised(self, _):
        self.as_user(self.citizen)
        res = self.client.post(URL, {"description": TEXT}, format="json")
        self.assertIsNone(res.data["suggested_department_id"])
        self.assertEqual(res.data["suggested_category"], "OTHER")
        self.assertEqual(res.data["suggested_priority"], "MEDIUM")

    @patch(FALLBACK_RESULT_PATCH, side_effect=AIServiceError("rate_limited", "The AI service rate limit was reached."))
    def test_rate_limit_returns_labelled_fallback(self, _):
        self.as_user(self.citizen)
        res = self.client.post(URL, {"description": TEXT}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["source"], "FALLBACK")
        self.assertFalse(res.data["ai_available"])
        self.assertIn("NOT AI", res.data["notice"])
        self.assertEqual(res.data["suggested_category"], "WATER_SUPPLY")
        log = AIAnalysisLog.objects.get()
        self.assertEqual((log.success, log.error_message), (False, "rate_limited"))


class GeminiClientTests(APIBase):
    @override_settings(GEMINI_API_KEY="")
    def test_missing_key_raises_service_error(self):
        with self.assertRaises(AIServiceError) as ctx:
            call_gemini("sys", "prompt")
        self.assertEqual(ctx.exception.reason, "not_configured")

    @override_settings(GEMINI_API_KEY="test-key")
    def test_rate_limit_error_is_mapped(self):
        from google.genai import errors

        client = MagicMock()
        client.models.generate_content.side_effect = errors.ClientError(429, {"error": {"message": "quota"}})
        with patch("google.genai.Client", return_value=client):
            with self.assertRaises(AIServiceError) as ctx:
                call_gemini("sys", "prompt")
        self.assertEqual(ctx.exception.reason, "rate_limited")

    @override_settings(GEMINI_API_KEY="test-key")
    def test_invalid_json_is_rejected(self):
        client = MagicMock()
        client.models.generate_content.return_value = SimpleNamespace(text="not json at all")
        with patch("google.genai.Client", return_value=client):
            with self.assertRaises(AIServiceError) as ctx:
                call_gemini("sys", "prompt")
        self.assertEqual(ctx.exception.reason, "invalid_response")

    @override_settings(GEMINI_API_KEY="test-key")
    def test_network_failure_is_mapped(self):
        client = MagicMock()
        client.models.generate_content.side_effect = TimeoutError("timed out")
        with patch("google.genai.Client", return_value=client):
            with self.assertRaises(AIServiceError) as ctx:
                call_gemini("sys", "prompt")
        self.assertEqual(ctx.exception.reason, "unavailable")
