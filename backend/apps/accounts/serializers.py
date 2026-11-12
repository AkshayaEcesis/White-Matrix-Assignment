from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.departments.serializers import DepartmentMiniSerializer

from .models import User, mobile_validator


class UserSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "mobile", "role", "role_label", "department", "designation")
        read_only_fields = ("id", "email", "role", "department", "designation")


class RegisterSerializer(serializers.ModelSerializer):
    """Public citizen registration. Role is always forced to CITIZEN on the server."""

    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)
    mobile = serializers.CharField(validators=[mobile_validator])
    full_name = serializers.RegexField(
        regex=r"^[A-Za-z][A-Za-z .'-]{1,148}$",
        error_messages={"invalid": "Name may contain only letters, spaces, dots, hyphens and apostrophes."},
    )

    class Meta:
        model = User
        fields = ("full_name", "email", "mobile", "password", "confirm_password")

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        candidate = User(email=attrs["email"], full_name=attrs["full_name"])
        validate_password(attrs["password"], user=candidate)
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, role=User.Role.CITIZEN, **validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get("request"),
            email=attrs["email"].strip().lower(),
            password=attrs["password"],
        )
        # Same message for unknown email / wrong password / inactive: avoids account enumeration.
        if not user or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.", code="authentication")
        attrs["user"] = user
        return attrs


class OfficerSerializer(serializers.ModelSerializer):
    department = DepartmentMiniSerializer(read_only=True)

    class Meta:
        model = User
        fields = ("id", "full_name", "email", "designation", "department")
