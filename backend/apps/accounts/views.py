from django.conf import settings
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from apps.core.permissions import IsCMOAdmin

from .models import User
from .serializers import LoginSerializer, OfficerSerializer, RegisterSerializer, UserSerializer
from .tokens import clear_refresh_cookie, issue_tokens, set_refresh_cookie


def _require_ajax_header(request):
    """
    CSRF defence-in-depth for the cookie-authenticated endpoints (refresh/logout).
    Browsers cannot attach a custom header to a cross-site request without a CORS
    pre-flight, which our CORS allow-list rejects for unknown origins.
    """
    if request.headers.get("X-Requested-With") != "XMLHttpRequest":
        raise PermissionDenied("Missing required request header.")


def _auth_response(user, refresh, status_code=status.HTTP_200_OK):
    response = Response(
        {"access": str(refresh.access_token), "user": UserSerializer(user).data}, status=status_code
    )
    set_refresh_cookie(response, refresh)
    return response


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return _auth_response(user, issue_tokens(user), status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"detail": "Invalid email or password."}, status=status.HTTP_401_UNAUTHORIZED)
        user = serializer.validated_data["user"]
        return _auth_response(user, issue_tokens(user))


class RefreshView(APIView):
    """Exchange the HttpOnly refresh cookie for a new access token (and rotated refresh cookie)."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = "refresh"

    def post(self, request):
        _require_ajax_header(request)
        raw = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not raw:
            # No session cookie = simply not logged in (normal on first visit), not an error.
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = TokenRefreshSerializer(data={"refresh": raw})
        try:
            serializer.is_valid(raise_exception=True)
            user_id = AccessToken(serializer.validated_data["access"])["user_id"]
            user = User.objects.get(pk=user_id, is_active=True)
        except Exception:  # expired / blacklisted / malformed token, or user disabled or deleted
            response = Response({"detail": "Session expired. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_refresh_cookie(response)
            return response

        response = Response(
            {"access": serializer.validated_data["access"], "user": UserSerializer(user).data}
        )
        set_refresh_cookie(response, serializer.validated_data.get("refresh", raw))
        return response


class LogoutView(APIView):
    """Blacklist the refresh token and clear the cookie. Works even if the access token expired."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        _require_ajax_header(request)
        raw = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass  # already invalid/expired - nothing to revoke
        response = Response({"detail": "Logged out."}, status=status.HTTP_200_OK)
        clear_refresh_cookie(response)
        return response


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.request.user


class OfficerListView(generics.ListAPIView):
    """CMO-only: list active officers, optionally filtered by ?department=<id>."""

    serializer_class = OfficerSerializer
    permission_classes = [IsCMOAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = User.objects.filter(role=User.Role.OFFICER, is_active=True).select_related("department")
        department = self.request.query_params.get("department")
        if department and department.isdigit():
            qs = qs.filter(department_id=department)
        return qs.order_by("full_name")
