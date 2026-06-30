from rest_framework import serializers

from .models import EntidadEmisora, EfectoNormativo, Materia, TipoNorma


class CatalogoBaseSerializer(serializers.ModelSerializer):
    def validate_nombre(self, value):
        value = value.strip()
        queryset = self.Meta.model.objects.filter(nombre__iexact=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un registro con este nombre.')
        return value

    def validate_descripcion(self, value):
        return value.strip()


class CatalogoConCodigoSerializer(CatalogoBaseSerializer):
    def validate_codigo(self, value):
        value = value.strip().upper()
        queryset = self.Meta.model.objects.filter(codigo=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe un registro con este código.')
        return value


class MateriaSerializer(CatalogoConCodigoSerializer):
    class Meta:
        model = Materia
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'activo',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class TipoNormaSerializer(CatalogoConCodigoSerializer):
    class Meta:
        model = TipoNorma
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'activo',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class EfectoNormativoSerializer(CatalogoConCodigoSerializer):
    class Meta:
        model = EfectoNormativo
        fields = (
            'id', 'codigo', 'nombre', 'descripcion', 'activo',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class EntidadEmisoraSerializer(CatalogoBaseSerializer):
    class Meta:
        model = EntidadEmisora
        fields = (
            'id', 'sigla', 'nombre', 'descripcion', 'sitio_web', 'activo',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_sigla(self, value):
        value = value.strip().upper()
        queryset = EntidadEmisora.objects.filter(sigla=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Ya existe una entidad con esta sigla.')
        return value
