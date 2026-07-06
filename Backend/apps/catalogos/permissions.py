from django.conf import settings
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdminOrReadOnly(BasePermission):
    message = 'Debe autenticarse. Solo un administrador puede modificar catálogos.'

    def has_permission(self, request, view):
        # Permite trabajar sin autenticación únicamente en desarrollo local.
        if settings.DEBUG:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff
