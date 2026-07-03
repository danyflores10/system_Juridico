from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class FuenteAccessPermission(BasePermission):
    message = 'Debe autenticarse. Solo un administrador puede modificar fuentes.'

    def has_permission(self, request, view):
        if settings.DEBUG:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff
