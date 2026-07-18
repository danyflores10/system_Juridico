from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from .models import PerfilUsuario, rol_de

User = get_user_model()


def _validar_email_unico(email: str, usuario_actual=None) -> str:
    email = email.strip().lower()
    consulta = User.objects.filter(email__iexact=email)
    if usuario_actual is not None:
        consulta = consulta.exclude(pk=usuario_actual.pk)
    if consulta.exists():
        raise serializers.ValidationError(
            'Ya existe un usuario registrado con este correo electrónico.'
        )
    return email


def _validar_contrasena(password: str, usuario=None) -> str:
    try:
        validate_password(password, usuario)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))
    return password


class UsuarioSerializer(serializers.ModelSerializer):
    """Representación de un usuario para el módulo de gestión."""

    nombre = serializers.CharField(source='first_name', max_length=150)
    apellido = serializers.CharField(
        source='last_name', max_length=150, allow_blank=True, required=False
    )
    # Solo escritura: la lectura se resuelve en to_representation con rol_de().
    rol = serializers.ChoiceField(choices=PerfilUsuario.Rol.choices, write_only=True)
    activo = serializers.BooleanField(source='is_active', default=True)
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        style={'input_type': 'password'},
    )
    avatar = serializers.SerializerMethodField()
    avatar_upload = serializers.ImageField(write_only=True, required=False)
    avatar_clear = serializers.BooleanField(write_only=True, required=False, default=False)
    fecha_registro = serializers.DateTimeField(source='date_joined', read_only=True)
    ultimo_acceso = serializers.DateTimeField(source='last_login', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'nombre',
            'apellido',
            'email',
            'rol',
            'activo',
            'password',
            'avatar',
            'avatar_upload',
            'avatar_clear',
            'fecha_registro',
            'ultimo_acceso',
        ]
        extra_kwargs = {'email': {'required': True}}

    def get_avatar(self, usuario):
        return _avatar_absoluto(usuario, self.context)

    def validate_email(self, value):
        return _validar_email_unico(value, usuario_actual=self.instance)

    def validate_password(self, value):
        return _validar_contrasena(value, self.instance)

    def validate_avatar_upload(self, archivo):
        if archivo and archivo.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('La imagen no debe superar los 5 MB.')
        return archivo

    def validate(self, attrs):
        if self.instance is None and not attrs.get('password'):
            raise serializers.ValidationError(
                {'password': 'La contraseña es obligatoria al crear un usuario.'}
            )
        return attrs

    def to_representation(self, instance):
        datos = super().to_representation(instance)
        datos['rol'] = rol_de(instance)
        return datos

    @transaction.atomic
    def create(self, validated_data):
        rol = validated_data.pop('rol')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        avatar_upload = validated_data.pop('avatar_upload', None)
        validated_data.pop('avatar_clear', None)
        usuario = User(username=email, email=email, **validated_data)
        usuario.is_staff = rol == PerfilUsuario.Rol.ADMIN
        usuario.set_password(password)
        usuario.save()
        defaults = {'rol': rol}
        if avatar_upload is not None:
            defaults['avatar'] = avatar_upload
        PerfilUsuario.objects.update_or_create(
            usuario=usuario, defaults=defaults
        )
        return usuario

    @transaction.atomic
    def update(self, instance, validated_data):
        rol = validated_data.pop('rol', None)
        password = validated_data.pop('password', None)
        email = validated_data.pop('email', None)
        avatar_upload = validated_data.pop('avatar_upload', None)
        avatar_clear = validated_data.pop('avatar_clear', False)
        if email:
            instance.email = email
            instance.username = email
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if rol is not None:
            instance.is_staff = (
                rol == PerfilUsuario.Rol.ADMIN or instance.is_superuser
            )
            PerfilUsuario.objects.update_or_create(
                usuario=instance, defaults={'rol': rol}
            )
        if password:
            instance.set_password(password)
        instance.save()
        if avatar_upload is not None or avatar_clear:
            perfil, _ = PerfilUsuario.objects.get_or_create(usuario=instance)
            if perfil.avatar:
                perfil.avatar.delete(save=False)
            perfil.avatar = avatar_upload if avatar_upload is not None else None
            perfil.save(update_fields=['avatar'])
        # Limpia relaciones cacheadas (p. ej. perfil por select_related)
        # para que la respuesta refleje el rol recién guardado.
        instance.refresh_from_db()
        return instance


def _avatar_absoluto(usuario, contexto):
    """URL absoluta del avatar, o None si no tiene."""
    perfil = getattr(usuario, 'perfil', None)
    if not perfil or not perfil.avatar:
        return None
    url = perfil.avatar.url
    request = contexto.get('request') if contexto else None
    return request.build_absolute_uri(url) if request else url


class UsuarioSesionSerializer(serializers.ModelSerializer):
    """Datos mínimos del usuario autenticado para el frontend."""

    nombre = serializers.CharField(source='first_name', read_only=True)
    apellido = serializers.CharField(source='last_name', read_only=True)
    rol = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'nombre', 'apellido', 'email', 'rol', 'avatar']

    def get_rol(self, usuario):
        return rol_de(usuario)

    def get_avatar(self, usuario):
        return _avatar_absoluto(usuario, self.context)


class PerfilPropioSerializer(serializers.ModelSerializer):
    """Perfil completo que cada usuario puede ver y editar de sí mismo."""

    nombre = serializers.CharField(source='first_name', max_length=150, allow_blank=True, required=False)
    apellido = serializers.CharField(source='last_name', max_length=150, allow_blank=True, required=False)
    rol = serializers.SerializerMethodField()
    activo = serializers.BooleanField(source='is_active', read_only=True)
    fecha_registro = serializers.DateTimeField(source='date_joined', read_only=True)
    ultimo_acceso = serializers.DateTimeField(source='last_login', read_only=True)
    telefono = serializers.CharField(source='perfil.telefono', max_length=40, allow_blank=True, required=False)
    matricula = serializers.CharField(source='perfil.matricula', max_length=80, allow_blank=True, required=False)
    especialidad = serializers.CharField(
        source='perfil.especialidad', max_length=120, allow_blank=True, required=False
    )
    bio = serializers.CharField(source='perfil.bio', allow_blank=True, required=False)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'nombre',
            'apellido',
            'email',
            'rol',
            'activo',
            'fecha_registro',
            'ultimo_acceso',
            'telefono',
            'matricula',
            'especialidad',
            'bio',
            'avatar',
        ]
        read_only_fields = ['id']

    def get_rol(self, usuario):
        return rol_de(usuario)

    def get_avatar(self, usuario):
        return _avatar_absoluto(usuario, self.context)

    def validate_email(self, value):
        return _validar_email_unico(value, usuario_actual=self.instance)

    @transaction.atomic
    def update(self, instance, validated_data):
        perfil_data = validated_data.pop('perfil', {})
        email = validated_data.pop('email', None)
        if email:
            instance.email = email
            instance.username = email
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()
        if perfil_data:
            perfil, _ = PerfilUsuario.objects.get_or_create(usuario=instance)
            for campo, valor in perfil_data.items():
                setattr(perfil, campo, valor)
            perfil.save()
        instance.refresh_from_db()
        return instance


class CambiarPasswordSerializer(serializers.Serializer):
    """Cambio de contraseña propia, verificando la contraseña actual."""

    password_actual = serializers.CharField(style={'input_type': 'password'})
    password_nueva = serializers.CharField(style={'input_type': 'password'})

    def validate_password_actual(self, value):
        usuario = self.context['request'].user
        if not usuario.check_password(value):
            raise serializers.ValidationError('La contraseña actual no es correcta.')
        return value

    def validate_password_nueva(self, value):
        return _validar_contrasena(value, self.context['request'].user)

    def save(self, **kwargs):
        usuario = self.context['request'].user
        usuario.set_password(self.validated_data['password_nueva'])
        usuario.save(update_fields=['password'])
        return usuario


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    # Identificador del dispositivo (cookie httpOnly emitida por el BFF).
    # Requerido solo para cuentas habilitadas por una suscripción.
    device_id = serializers.CharField(
        required=False, allow_blank=True, default=''
    )

    default_error_messages = {
        'credenciales': 'Correo o contraseña incorrectos.',
        'inactivo': 'Tu cuenta está desactivada. Contacta al administrador.',
    }

    def validate(self, attrs):
        email = attrs['email'].strip().lower()
        password = attrs['password']
        usuario = User.objects.filter(email__iexact=email).first()
        if usuario is None or not usuario.check_password(password):
            self.fail('credenciales')
        if not usuario.is_active:
            self.fail('inactivo')

        # Regla del módulo de suscripciones: cada usuario y contraseña
        # habilita 1 solo dispositivo (el primero que inicia sesión).
        from apps.suscripciones.services import (
            DispositivoNoAutorizado,
            validar_dispositivo,
        )

        request = self.context.get('request')
        user_agent = (
            request.META.get('HTTP_USER_AGENT', '') if request else ''
        )
        try:
            validar_dispositivo(
                usuario, attrs.get('device_id'), user_agent
            )
        except DispositivoNoAutorizado as exc:
            raise serializers.ValidationError(str(exc))

        attrs['usuario'] = usuario
        return attrs


class RegistroSerializer(serializers.Serializer):
    """Autorregistro público: siempre crea cuentas con rol usuario."""

    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    nombre = serializers.CharField(max_length=150, required=False, allow_blank=True)
    apellido = serializers.CharField(max_length=150, required=False, allow_blank=True)

    def validate_email(self, value):
        return _validar_email_unico(value)

    def validate_password(self, value):
        return _validar_contrasena(value)

    @transaction.atomic
    def create(self, validated_data):
        email = validated_data['email']
        usuario = User(
            username=email,
            email=email,
            first_name=validated_data.get('nombre', ''),
            last_name=validated_data.get('apellido', ''),
        )
        usuario.set_password(validated_data['password'])
        usuario.save()
        PerfilUsuario.objects.update_or_create(
            usuario=usuario, defaults={'rol': PerfilUsuario.Rol.USUARIO}
        )
        return usuario
