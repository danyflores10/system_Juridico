from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class DocumentoAccessPermission(BasePermission):
    message = 'Debe autenticarse. Solo un administrador puede modificar documentos.'

    def has_permission(self, request, view):
        if settings.DEBUG:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        if getattr(view, 'action', '') in {
            'iniciar_revision_juridica',
            'aprobar_revision_juridica',
            'devolver_revision_juridica',
        }:
            return True
        return request.user.is_staff
