"""
Thin wrapper around the official Google Gen AI Python SDK (google-genai).

The API key is read from the server environment only; it is never sent to the browser.
All failures are converted into AIServiceError so callers can fall back transparently.
"""

import logging
import time

from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Raised when the AI provider cannot return a valid analysis."""

    def __init__(self, reason, user_message):
        super().__init__(reason)
        self.reason = reason
        self.user_message = user_message


class GeminiAnalysis(BaseModel):
    """Structured-output schema enforced on the model response."""

    suggested_department: str = Field(description="Exact department name from the allowed list, or 'NONE'.")
    suggested_category: str = Field(description="Exact category code from the allowed list.")
    suggested_priority: str = Field(description="One of LOW, MEDIUM, HIGH.")
    summary: str = Field(description="Neutral 1-2 sentence summary for CMO administrators (max 300 chars).")
    duplicate_warning: bool = Field(description="True only if a listed existing grievance is very likely the same issue.")
    duplicate_reference: str = Field(description="Reference number of the likely duplicate, or empty string.")
    reasoning: str = Field(description="Short explanation of the suggestions (max 400 chars).")


def call_gemini(system_instruction, prompt):
    """Call Gemini and return (GeminiAnalysis, latency_ms). Raises AIServiceError on any failure."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise AIServiceError("not_configured", "The AI service is not configured on the server.")

    from google import genai
    from google.genai import errors, types

    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(timeout=settings.GEMINI_TIMEOUT_SECONDS * 1000),
    )
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        response_schema=GeminiAnalysis,
        temperature=0.2,
    )

    started = time.monotonic()
    last_error = None
    for attempt in range(2):  # one retry for transient server errors only
        try:
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL, contents=prompt, config=config
            )
            latency = int((time.monotonic() - started) * 1000)
            text = (response.text or "").strip()
            if not text:
                raise AIServiceError("empty_response", "The AI service returned an empty response.")
            try:
                return GeminiAnalysis.model_validate_json(text), latency
            except Exception as exc:
                raise AIServiceError("invalid_response", "The AI service returned an invalid response.") from exc
        except errors.ClientError as exc:
            if exc.code == 429:
                raise AIServiceError("rate_limited", "The AI service rate limit was reached. Please try again shortly.") from exc
            logger.warning("Gemini rejected request: %s", exc.code)
            raise AIServiceError("rejected", "The AI service rejected the request.") from exc
        except errors.ServerError as exc:
            last_error = exc
            logger.warning("Gemini server error (attempt %s): %s", attempt + 1, exc.code)
            time.sleep(0.8)
        except AIServiceError:
            raise
        except Exception as exc:  # network failures, timeouts, SDK errors
            logger.warning("Gemini call failed: %s", type(exc).__name__)
            raise AIServiceError("unavailable", "The AI service is temporarily unavailable.") from exc
    raise AIServiceError("unavailable", "The AI service is temporarily unavailable.") from last_error
