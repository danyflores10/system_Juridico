from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
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


def _respuesta_sesion(usuario):
    return {
        'usuario': UsuarioSesionSerializer(usuario).data,
        'tokens': _tokens_para(usuario),
    }


class LoginThrottle(AnonRateThrottle):
    scope = 'login'


class LoginView(APIView):
    """Inicio de sesión con correo y contraseña. Devuelve JWT + usuario."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data['usuario']
        usuario.last_login = timezone.now()
        usuario.save(update_fields=['last_login'])
        return Response(_respuesta_sesion(usuario))


class RegistroView(APIView):
    """Registro público: crea cuentas con rol usuario e inicia sesión."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        usuario.last_login = timezone.now()
        usuario.save(update_fields=['last_login'])
        return Response(_respuesta_sesion(usuario), status=status.HTTP_201_CREATED)


class RefreshView(TokenRefreshView):
    """Renovación del token de acceso."""


class MeView(APIView):
    """Datos del usuario autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSesionSerializer(request.user).data)


class PerfilPropioView(APIView):
    """Ver y editar el perfil de la cuenta autenticada (cualquier rol)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        PerfilUsuario.objects.get_or_create(usuario=request.user)
        return Response(PerfilPropioSerializer(request.user).data)

    def patch(self, request):
        PerfilUsuario.objects.get_or_create(usuario=request.user)
        serializer = PerfilPropioSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


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
        return Response(UsuarioSerializer(usuario).data)

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
        return Response(UsuarioSerializer(usuario).data)
