"""
JWT helpers.

Token strategy (see DOCUMENTATION/SECURITY_REVIEW.md):
  * Access token  - short-lived, returned in the JSON body, kept ONLY in browser memory.
  * Refresh token - long-lived, stored in an HttpOnly + SameSite cookie scoped to /api/v1/auth/,
                    so JavaScript (and therefore XSS) can never read it.
  * Refresh tokens rotate on every use and the old one is blacklisted.
"""

from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role  # informational only; the backend re-reads the user from the DB
    return refresh


def set_refresh_cookie(response, refresh_token):
    response.set_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        value=str(refresh_token),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite=settings.JWT_COOKIE_SAMESITE,
        path=settings.JWT_COOKIE_PATH,
    )


def clear_refresh_cookie(response):
    response.delete_cookie(
        key=settings.JWT_REFRESH_COOKIE_NAME,
        path=settings.JWT_COOKIE_PATH,
        samesite=settings.JWT_COOKIE_SAMESITE,
    )
