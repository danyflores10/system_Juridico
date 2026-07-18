from rest_framework.permissions import BasePermission

from .models import PerfilUsuario, rol_de


class EsAdministrador(BasePermission):
    """Permite el acceso únicamente a usuarios autenticados con rol admin.

    A diferencia de otros módulos, aquí NO se relaja en DEBUG: la gestión
    de cuentas siempre exige credenciales válidas.
    """

    message = 'Solo un administrador puede gestionar usuarios.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and rol_de(request.user) == PerfilUsuario.Rol.ADMIN
        )
