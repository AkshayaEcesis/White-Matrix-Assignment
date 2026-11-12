"""Role-based permission classes. Every protected endpoint enforces these on the server."""

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class HasRole(BasePermission):
    allowed_roles: tuple = ()
    message = "You do not have permission to perform this action."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active and user.role in self.allowed_roles
        )


class IsCitizen(HasRole):
    allowed_roles = (User.Role.CITIZEN,)
    message = "Only citizens can access this resource."


class IsCMOAdmin(HasRole):
    allowed_roles = (User.Role.CMO_ADMIN,)
    message = "Only CMO administrators can access this resource."


class IsOfficer(HasRole):
    allowed_roles = (User.Role.OFFICER,)
    message = "Only department officers can access this resource."

    def has_permission(self, request, view):
        # An officer without a department must never see any grievance.
        return super().has_permission(request, view) and request.user.department_id is not None
