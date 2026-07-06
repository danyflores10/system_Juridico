from rest_framework import serializers
from django.utils.text import slugify
from urllib.parse import urlsplit

from apps.catalogos.models import EntidadEmisora, Materia

from .models import EjecucionFuente, FuenteSeccion, FuenteWeb, HallazgoFuente
from .validators import validar_url_fuente


class MateriaResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materia
        fields = ('id', 'codigo', 'nombre')


class EntidadResumenSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntidadEmisora
        fields = ('id', 'codigo', 'sigla', 'nombre')


class FuenteSeccionSerializer(serializers.ModelSerializer):
    materia_predeterminada_detalle = MateriaResumenSerializer(
        source='materia_predeterminada',
        read_only=True,
    )
    fuente_nombre = serializers.CharField(source='fuente.nombre', read_only=True)

    class Meta:
        model = FuenteSeccion
        fields = (
            'id', 'fuente', 'fuente_nombre', 'codigo', 'nombre', 'descripcion',
            'url_listado', 'url_busqueda', 'materia_predeterminada',
            'materia_predeterminada_detalle', 'configuracion', 'activa',
            'orden', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_codigo(self, value):
        return value.strip().upper()

    def validate_nombre(self, value):
        return ' '.join(value.split())

    def validate(self, attrs):
        attrs = super().validate(attrs)
        fuente = attrs.get('fuente', getattr(self.instance, 'fuente', None))
        codigo = attrs.get('codigo', getattr(self.instance, 'codigo', None))
        if fuente and codigo:
            queryset = FuenteSeccion.objects.filter(fuente=fuente, codigo=codigo)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError({
                    'codigo': 'Ya existe una sección con este código en la fuente.'
                })
        return attrs


class FuenteWebListSerializer(serializers.ModelSerializer):
    materia_predeterminada = MateriaResumenSerializer(read_only=True)
    entidad_emisora_predeterminada = EntidadResumenSerializer(read_only=True)
    cantidad_secciones = serializers.IntegerField(read_only=True)

    class Meta:
        model = FuenteWeb
        fields = (
            'id', 'codigo', 'nombre', 'url_base', 'tipo_fuente',
            'motor_consulta', 'materia_predeterminada',
            'entidad_emisora_predeterminada', 'activa',
            'ultimo_estado_prueba', 'ultima_prueba_en',
            'ultimo_codigo_http', 'cantidad_secciones', 'updated_at',
        )


class FuenteWebWriteSerializer(serializers.ModelSerializer):
    codigo = serializers.CharField(required=False, allow_blank=True, max_length=30)
    url_base = serializers.URLField(
        required=False,
        allow_blank=True,
        validators=(validar_url_fuente,),
    )

    class Meta:
        model = FuenteWeb
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'url_base',
            'url_consulta_principal', 'tipo_fuente', 'motor_consulta',
            'requiere_javascript', 'requiere_autenticacion',
            'frecuencia_consulta', 'materia_predeterminada',
            'entidad_emisora_predeterminada', 'configuracion', 'activa',
            'orden', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_codigo(self, value):
        value = value.strip().upper()
        if not value:
            return value
        queryset = FuenteWeb.objects.filter(codigo=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe una fuente con este código.'
            )
        return value

    def create(self, validated_data):
        consulta = validated_data.get('url_consulta_principal', '').strip()
        if not validated_data.get('url_base') and consulta:
            parsed = urlsplit(consulta)
            validated_data['url_base'] = f'{parsed.scheme}://{parsed.netloc}'
        if not validated_data.get('codigo'):
            validated_data['codigo'] = self._generar_codigo(
                validated_data.get('nombre', 'FUENTE')
            )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        consulta = validated_data.get('url_consulta_principal', '').strip()
        if validated_data.get('url_base') == '' and consulta:
            parsed = urlsplit(consulta)
            validated_data['url_base'] = f'{parsed.scheme}://{parsed.netloc}'
        return super().update(instance, validated_data)

    @staticmethod
    def _generar_codigo(nombre):
        words = [
            word for word in slugify(nombre).split('-')
            if word not in {'de', 'del', 'la', 'las', 'el', 'los', 'y'}
        ]
        base = (
            ''.join(word[0] for word in words).upper()
            if len(words) > 1
            else (words[0][:10].upper() if words else 'FUENTE')
        )
        base = base[:24] or 'FUENTE'
        candidate = base
        suffix = 2
        while FuenteWeb.objects.filter(codigo=candidate).exists():
            candidate = f'{base[:24]}-{suffix}'
            suffix += 1
        return candidate

    def validate_nombre(self, value):
        value = ' '.join(value.split())
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        requiere_javascript = attrs.get(
            'requiere_javascript',
            getattr(self.instance, 'requiere_javascript', False),
        )
        motor = attrs.get(
            'motor_consulta',
            getattr(self.instance, 'motor_consulta', FuenteWeb.MotorConsulta.HTTPX),
        )
        if requiere_javascript and motor != FuenteWeb.MotorConsulta.PLAYWRIGHT:
            raise serializers.ValidationError({
                'motor_consulta': (
                    'Las fuentes que requieren JavaScript deben usar Playwright.'
                )
            })
        return attrs


class FuenteWebDetailSerializer(serializers.ModelSerializer):
    materia_predeterminada = MateriaResumenSerializer(read_only=True)
    entidad_emisora_predeterminada = EntidadResumenSerializer(read_only=True)
    secciones = FuenteSeccionSerializer(many=True, read_only=True)
    cantidad_secciones = serializers.SerializerMethodField()

    class Meta:
        model = FuenteWeb
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'url_base',
            'url_consulta_principal', 'tipo_fuente', 'motor_consulta',
            'requiere_javascript', 'requiere_autenticacion',
            'frecuencia_consulta', 'materia_predeterminada',
            'entidad_emisora_predeterminada', 'configuracion', 'activa',
            'orden', 'ultimo_estado_prueba', 'ultima_prueba_en',
            'ultimo_codigo_http', 'ultimo_mensaje_prueba',
            'ultimo_error_prueba', 'cantidad_secciones', 'secciones',
            'created_at', 'updated_at',
        )

    def get_cantidad_secciones(self, obj) -> int:
        return obj.secciones.count()


class EjecucionFuenteSerializer(serializers.ModelSerializer):
    fuente_nombre = serializers.CharField(source='fuente.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    solicitado_por_nombre = serializers.CharField(
        source='solicitado_por.get_username',
        read_only=True,
    )

    class Meta:
        model = EjecucionFuente
        fields = (
            'id', 'fuente', 'fuente_nombre', 'seccion', 'seccion_nombre',
            'tipo_ejecucion', 'estado', 'inicio', 'fin', 'codigo_http',
            'documentos_encontrados', 'mensaje', 'detalle_error',
            'documentos_descargados', 'documentos_duplicados',
            'documentos_omitidos', 'total_errores', 'paginas_revisadas',
            'tarea_id', 'duracion_ms',
            'solicitado_por', 'solicitado_por_nombre', 'created_at',
        )
        read_only_fields = fields


class HallazgoFuenteSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    fuente_nombre = serializers.CharField(source='fuente.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)
    documento_uuid = serializers.UUIDField(source='documento.uuid', read_only=True)
    documento_codigo = serializers.CharField(
        source='documento.codigo_interno',
        read_only=True,
    )

    class Meta:
        model = HallazgoFuente
        fields = (
            'id', 'ejecucion', 'fuente', 'fuente_nombre', 'seccion',
            'seccion_nombre', 'documento', 'documento_uuid',
            'documento_codigo', 'estado', 'estado_display', 'url',
            'titulo_encontrado', 'nombre_archivo', 'codigo_http',
            'mime_type', 'tamano_bytes', 'hash_sha256', 'mensaje',
            'detalle_error', 'created_at',
        )
        read_only_fields = fields
