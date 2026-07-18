from django.contrib.auth import get_user_model
from django.utils import timezone
from PIL import Image
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import PerfilUsuario, rol_de
from .permissions import EsAdministrador
from .serializers import (
    CambiarPasswordSerializer,
    LoginSerializer,
    PerfilPropioSerializer,
    RegistroSerializer,
    UsuarioSerializer,
    UsuarioSesionSerializer,
)

User = get_user_model()


def _tokens_para(usuario):
    refresh = RefreshToken.for_user(usuario)
    refresh['rol'] = rol_de(usuario)
    return {'access': str(refresh.access_token), 'refresh': str(refresh)}


def _respuesta_sesion(usuario, request=None):
    contexto = {'request': request} if request else {}
    return {
        'usuario': UsuarioSesionSerializer(usuario, context=contexto).data,
        'tokens': _tokens_para(usuario),
    }


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class LoginHourThrottle(AnonRateThrottle):
    scope = 'login_hour'


class LoginView(APIView):
    """Inicio de sesión con correo y contraseña. Devuelve JWT + usuario."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle, LoginHourThrottle]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data['usuario']
        usuario.last_login = timezone.now()
        usuario.save(update_fields=['last_login'])
        return Response(_respuesta_sesion(usuario, request))


class RegistroView(APIView):
    """Registro público: crea cuentas con rol usuario e inicia sesión."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle, LoginHourThrottle]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        usuario.last_login = timezone.now()
        usuario.save(update_fields=['last_login'])
        return Response(_respuesta_sesion(usuario, request), status=status.HTTP_201_CREATED)


class RefreshView(TokenRefreshView):
    """Renovación del token de acceso."""


class LogoutView(APIView):
    """Cierra sesión invalidando (blacklist) el refresh token entregado.

    Tras esto, el refresh ya no puede generar nuevos access tokens; el access
    actual expira por sí solo en pocos minutos.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        refresh = request.data.get('refresh')
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                # Token ya expirado/ inválido: la sesión igual queda cerrada.
                pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(APIView):
    """Datos del usuario autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSesionSerializer(request.user, context={'request': request}).data)


class PerfilPropioView(APIView):
    """Ver y editar el perfil de la cuenta autenticada (cualquier rol)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        PerfilUsuario.objects.get_or_create(usuario=request.user)
        return Response(PerfilPropioSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        PerfilUsuario.objects.get_or_create(usuario=request.user)
        serializer = PerfilPropioSerializer(
            request.user, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AvatarView(APIView):
    """Sube o elimina la foto de perfil del usuario autenticado."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    TIPOS_PERMITIDOS = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    TAMANO_MAXIMO = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        archivo = request.FILES.get('avatar')
        if archivo is None:
            return Response(
                {'detail': 'No se envió ninguna imagen.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if archivo.size > self.TAMANO_MAXIMO:
            return Response(
                {'detail': 'La imagen no debe superar los 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if archivo.content_type not in self.TIPOS_PERMITIDOS:
            return Response(
                {'detail': 'Formato no permitido. Usa una imagen JPG, PNG, WEBP o GIF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Verifica que el contenido sea realmente una imagen válida.
        try:
            Image.open(archivo).verify()
        except Exception:
            return Response(
                {'detail': 'El archivo no es una imagen válida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        archivo.seek(0)

        perfil, _ = PerfilUsuario.objects.get_or_create(usuario=request.user)
        if perfil.avatar:
            perfil.avatar.delete(save=False)
        perfil.avatar = archivo
        perfil.save()
        return Response(PerfilPropioSerializer(request.user, context={'request': request}).data)

    def delete(self, request):
        perfil, _ = PerfilUsuario.objects.get_or_create(usuario=request.user)
        if perfil.avatar:
            perfil.avatar.delete(save=True)
        return Response(PerfilPropioSerializer(request.user, context={'request': request}).data)


class CambiarPasswordView(APIView):
    """Cambio de la propia contraseña verificando la actual."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Contraseña actualizada correctamente.'})


class UsuarioViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios. Solo accesible para administradores."""

    serializer_class = UsuarioSerializer
    permission_classes = [EsAdministrador]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    search_fields = ['first_name', 'last_name', 'email']
    ordering_fields = ['first_name', 'email', 'date_joined', 'last_login']
    ordering = ['-date_joined']
    filterset_fields = {'is_active': ['exact']}

    def get_queryset(self):
        queryset = User.objects.select_related('perfil').all()
        rol = self.request.query_params.get('rol')
        if rol in PerfilUsuario.Rol.values:
            if rol == PerfilUsuario.Rol.ADMIN:
                queryset = queryset.filter(perfil__rol=rol) | queryset.filter(
                    is_superuser=True
                )
            else:
                queryset = queryset.filter(
                    perfil__rol=rol, is_superuser=False
                )
        return queryset.distinct()

    def _es_el_mismo(self, usuario):
        return usuario.pk == self.request.user.pk

    def perform_destroy(self, instance):
        if self._es_el_mismo(instance):
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {'detail': 'No puedes eliminar tu propia cuenta.'}
            )
        instance.delete()

    def perform_update(self, serializer):
        instance = serializer.instance
        if self._es_el_mismo(instance):
            datos = serializer.validated_data
            if datos.get('is_active') is False:
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    {'detail': 'No puedes desactivar tu propia cuenta.'}
                )
            if (
                'rol' in datos
                and datos['rol'] != PerfilUsuario.Rol.ADMIN
            ):
                from rest_framework.exceptions import ValidationError

                raise ValidationError(
                    {'detail': 'No puedes quitarte tu propio rol de administrador.'}
                )
        serializer.save()

    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        usuario = self.get_object()
        usuario.is_active = True
        usuario.save(update_fields=['is_active'])
        return Response(UsuarioSerializer(usuario, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        usuario = self.get_object()
        if usuario.pk == request.user.pk:
            return Response(
                {'detail': 'No puedes desactivar tu propia cuenta.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.is_active = False
        usuario.save(update_fields=['is_active'])
        return Response(UsuarioSerializer(usuario, context={'request': request}).data)
