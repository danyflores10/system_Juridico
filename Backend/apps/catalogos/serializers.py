from rest_framework import serializers

from .models import (
    EntidadEmisora,
    EfectoNormativo,
    Materia,
    PalabraClaveMateria,
    PatronTipoNorma,
    ReglaEfectoNormativo,
    TipoNorma,
)


def limpiar_texto(value):
    return ' '.join(value.split())


class BaseCatalogoSerializer(serializers.ModelSerializer):
    def validate_codigo(self, value):
        value = value.strip().upper()
        if ';' in value:
            raise serializers.ValidationError(
                'El código no puede contener punto y coma (;).'
            )
        queryset = self.Meta.model.objects.filter(codigo=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe un registro con este código.'
            )
        return value

    def validate_nombre(self, value):
        value = limpiar_texto(value)
        if not value:
            raise serializers.ValidationError('El nombre es obligatorio.')
        queryset = self.Meta.model.objects.filter(nombre__iexact=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe un registro con este nombre.'
            )
        return value

    def validate_descripcion(self, value):
        return limpiar_texto(value)


class TipoNormaSerializer(BaseCatalogoSerializer):
    class Meta:
        model = TipoNorma
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'abreviatura_archivo',
            'requiere_numero', 'requiere_fecha', 'activo', 'orden',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {'abreviatura_archivo': {'required': False}}

    def validate_abreviatura_archivo(self, value):
        value = value.strip().upper()
        if ';' in value:
            raise serializers.ValidationError(
                'La abreviatura no puede contener punto y coma (;).'
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is None:
            codigo = attrs.get('codigo')
            abreviatura = attrs.get('abreviatura_archivo', codigo)
            if codigo != abreviatura:
                raise serializers.ValidationError({
                    'abreviatura_archivo': (
                        'La abreviatura debe ser igual al código al crear el tipo de norma.'
                    )
                })
            attrs['abreviatura_archivo'] = abreviatura
        return attrs


class EfectoNormativoSerializer(BaseCatalogoSerializer):
    class Meta:
        model = EfectoNormativo
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'abreviatura_archivo',
            'es_efecto_final', 'activo', 'orden', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {'abreviatura_archivo': {'required': False}}

    def validate_codigo(self, value):
        value = super().validate_codigo(value)
        if len(value) != 1 or not value.isalpha() or not value.isascii():
            raise serializers.ValidationError(
                'El código debe ser una sola letra mayúscula.'
            )
        return value

    def validate_abreviatura_archivo(self, value):
        value = value.strip().upper()
        if len(value) != 1:
            raise serializers.ValidationError(
                'La abreviatura debe tener exactamente un carácter.'
            )
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is None and 'abreviatura_archivo' not in attrs:
            attrs['abreviatura_archivo'] = attrs.get('codigo', '')
        return attrs


class MateriaSerializer(BaseCatalogoSerializer):
    class Meta:
        model = Materia
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'slug',
            'carpeta_destino', 'color_etiqueta', 'requiere_revision',
            'activo', 'orden', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_slug(self, value):
        value = value.strip().lower()
        queryset = Materia.objects.filter(slug=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe una materia con este slug.')
        return value

    def validate_carpeta_destino(self, value):
        value = limpiar_texto(value)
        invalidos = set('/\\:*?"<>|;')
        if not value or '..' in value or any(char in value for char in invalidos):
            raise serializers.ValidationError(
                'La carpeta no puede contener barras, caracteres inválidos ni rutas relativas.'
            )
        queryset = Materia.objects.filter(carpeta_destino__iexact=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe una materia con esta carpeta de destino.'
            )
        return value


class EntidadEmisoraSerializer(BaseCatalogoSerializer):
    class Meta:
        model = EntidadEmisora
        fields = (
            'id', 'codigo', 'sigla', 'nombre', 'tipo_entidad', 'nivel',
            'sitio_web', 'descripcion', 'activo', 'orden',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')
        extra_kwargs = {'codigo': {'required': False}}

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is None and 'codigo' not in attrs:
            attrs['codigo'] = attrs.get('sigla', '')
        return attrs

    def validate_sigla(self, value):
        value = value.strip().upper()
        queryset = EntidadEmisora.objects.filter(sigla=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError(
                'Ya existe una entidad con esta sigla.'
            )
        return value

    def validate_nivel(self, value):
        return limpiar_texto(value).upper()


class PatronTipoNormaSerializer(serializers.ModelSerializer):
    tipo_norma_nombre = serializers.CharField(
        source='tipo_norma.nombre',
        read_only=True,
    )

    class Meta:
        model = PatronTipoNorma
        fields = (
            'id', 'tipo_norma', 'tipo_norma_nombre', 'patron_regex',
            'ejemplo_texto', 'prioridad', 'activo', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_ejemplo_texto(self, value):
        return limpiar_texto(value)


class PalabraClaveMateriaSerializer(serializers.ModelSerializer):
    materia_nombre = serializers.CharField(source='materia.nombre', read_only=True)

    class Meta:
        model = PalabraClaveMateria
        fields = (
            'id', 'materia', 'materia_nombre', 'palabra_clave', 'peso',
            'activo', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_palabra_clave(self, value):
        value = limpiar_texto(value)
        if not value:
            raise serializers.ValidationError('La palabra clave es obligatoria.')
        return value


class ReglaEfectoNormativoSerializer(serializers.ModelSerializer):
    efecto_normativo_nombre = serializers.CharField(
        source='efecto_normativo.nombre',
        read_only=True,
    )

    class Meta:
        model = ReglaEfectoNormativo
        fields = (
            'id', 'efecto_normativo', 'efecto_normativo_nombre', 'expresion',
            'prioridad', 'activo', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_expresion(self, value):
        value = limpiar_texto(value).upper()
        if not value:
            raise serializers.ValidationError('La expresión es obligatoria.')
        return value
