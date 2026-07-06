from django.db.models import Q
from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    EntidadEmisora,
    EfectoNormativo,
    Materia,
    PalabraClaveMateria,
    PatronTipoNorma,
    ReglaEfectoNormativo,
    TipoNorma,
)
from .permissions import IsAdminOrReadOnly
from .serializers import (
    EntidadEmisoraSerializer,
    EfectoNormativoSerializer,
    MateriaSerializer,
    PalabraClaveMateriaSerializer,
    PatronTipoNormaSerializer,
    ReglaEfectoNormativoSerializer,
    TipoNormaSerializer,
)


class BaseEstadoViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminOrReadOnly,)
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    ordering = ('id',)
    ordering_fields = ('created_at', 'updated_at')
    search_fields = ()

    def get_queryset(self):
        queryset = super().get_queryset()
        activo = self.request.query_params.get('activo')
        if activo is not None:
            valor = activo.lower()
            if valor in {'1', 'true', 'si', 'sí'}:
                queryset = queryset.filter(activo=True)
            elif valor in {'0', 'false', 'no'}:
                queryset = queryset.filter(activo=False)
            elif valor not in {'todos', 'all'}:
                raise serializers.ValidationError(
                    {'activo': 'Use true, false o todos.'}
                )

        query = self.request.query_params.get('q', '').strip()
        if query and self.search_fields:
            filtro = Q()
            for field in self.search_fields:
                filtro |= Q(**{f'{field}__icontains': query})
            queryset = queryset.filter(filtro)
        return queryset

    @action(detail=True, methods=('post',))
    def activar(self, request, pk=None):
        instance = self.get_object()
        instance.activo = True
        instance.save(update_fields=('activo', 'updated_at'))
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=('post',))
    def desactivar(self, request, pk=None):
        instance = self.get_object()
        self._validar_desactivacion(instance)
        instance.activo = False
        instance.save(update_fields=('activo', 'updated_at'))
        return Response(self.get_serializer(instance).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self._validar_desactivacion(instance)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_update(self, serializer):
        instance = self.get_object()
        nuevo_activo = serializer.validated_data.get('activo', instance.activo)
        if instance.activo and not nuevo_activo:
            self._validar_desactivacion(instance)
        serializer.save()

    def _validar_desactivacion(self, instance):
        documentos = getattr(instance, 'documentos', None)
        if documentos is not None and documentos.exists():
            raise serializers.ValidationError({
                'activo': (
                    'No se puede desactivar porque el registro está asociado '
                    'a documentos jurídicos.'
                )
            })


class BaseCatalogoViewSet(BaseEstadoViewSet):
    ordering = ('orden', 'nombre')
    ordering_fields = (
        'codigo', 'nombre', 'orden', 'created_at', 'updated_at',
    )
    search_fields = ('codigo', 'nombre', 'descripcion')


class MateriaViewSet(BaseCatalogoViewSet):
    queryset = Materia.objects.all()
    serializer_class = MateriaSerializer


class TipoNormaViewSet(BaseCatalogoViewSet):
    queryset = TipoNorma.objects.all()
    serializer_class = TipoNormaSerializer


class EfectoNormativoViewSet(BaseCatalogoViewSet):
    queryset = EfectoNormativo.objects.all()
    serializer_class = EfectoNormativoSerializer


class EntidadEmisoraViewSet(BaseCatalogoViewSet):
    queryset = EntidadEmisora.objects.all()
    serializer_class = EntidadEmisoraSerializer
    search_fields = ('codigo', 'sigla', 'nombre', 'descripcion')
    ordering_fields = BaseCatalogoViewSet.ordering_fields + ('sigla',)


class PatronTipoNormaViewSet(BaseEstadoViewSet):
    queryset = PatronTipoNorma.objects.select_related('tipo_norma')
    serializer_class = PatronTipoNormaSerializer
    search_fields = ('patron_regex', 'ejemplo_texto', 'tipo_norma__nombre')
    ordering_fields = ('prioridad', 'created_at', 'updated_at')
    ordering = ('prioridad', 'id')


class PalabraClaveMateriaViewSet(BaseEstadoViewSet):
    queryset = PalabraClaveMateria.objects.select_related('materia')
    serializer_class = PalabraClaveMateriaSerializer
    search_fields = ('palabra_clave', 'materia__nombre')
    ordering_fields = ('palabra_clave', 'peso', 'created_at', 'updated_at')
    ordering = ('-peso', 'palabra_clave')


class ReglaEfectoNormativoViewSet(BaseEstadoViewSet):
    queryset = ReglaEfectoNormativo.objects.select_related('efecto_normativo')
    serializer_class = ReglaEfectoNormativoSerializer
    search_fields = ('expresion', 'efecto_normativo__nombre')
    ordering_fields = ('expresion', 'prioridad', 'created_at', 'updated_at')
    ordering = ('prioridad', 'expresion')
