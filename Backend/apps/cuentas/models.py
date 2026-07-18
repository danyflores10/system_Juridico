from django.conf import settings
from django.db import models


class PerfilUsuario(models.Model):
    """Extiende el usuario de Django con el rol de la aplicación."""

    class Rol(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        USUARIO = 'usuario', 'Usuario'

    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='perfil',
    )
    rol = models.CharField(
        max_length=20,
        choices=Rol.choices,
        default=Rol.USUARIO,
    )
    telefono = models.CharField(max_length=40, blank=True, default='')
    matricula = models.CharField(max_length=80, blank=True, default='')
    especialidad = models.CharField(max_length=120, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'perfil de usuario'
        verbose_name_plural = 'perfiles de usuario'

    def __str__(self):
        return f'{self.usuario.get_username()} ({self.get_rol_display()})'


def rol_de(usuario) -> str:
    """Devuelve el rol efectivo de un usuario (superusuarios son admin)."""
    if not usuario or not usuario.is_authenticated:
        return ''
    if usuario.is_superuser:
        return PerfilUsuario.Rol.ADMIN
    perfil = getattr(usuario, 'perfil', None)
    return perfil.rol if perfil else PerfilUsuario.Rol.USUARIO
