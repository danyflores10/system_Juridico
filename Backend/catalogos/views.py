from rest_framework import filters, mixins, serializers, viewsets

from .models import EntidadEmisora, EfectoNormativo, Materia, TipoNorma
from .permissions import IsAdminOrReadOnly
from .serializers import (
    EntidadEmisoraSerializer,
    EfectoNormativoSerializer,
    MateriaSerializer,
    TipoNormaSerializer,
)


class CatalogoViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (IsAdminOrReadOnly,)
    pagination_class = None
    filter_backends = (filters.SearchFilter, filters.OrderingFilter)
    ordering = ('nombre',)
    ordering_fields = ('nombre', 'created_at', 'updated_at')
    search_fields = ('nombre', 'descripcion')

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != 'list':
            return queryset

        activo = self.request.query_params.get('activo', 'true').lower()
        valores_verdaderos = {'1', 'true', 'si', 'sí'}
        valores_falsos = {'0', 'false', 'no'}
        if activo in valores_verdaderos:
            return queryset.filter(activo=True)
        if activo in valores_falsos:
            return queryset.filter(activo=False)
        if activo == 'todos':
            return queryset
        raise serializers.ValidationError(
            {'activo': 'Use true, false o todos.'}
        )


class MateriaViewSet(CatalogoViewSet):
    queryset = Materia.objects.all()
    serializer_class = MateriaSerializer
    search_fields = ('codigo', 'nombre', 'descripcion')
    ordering_fields = ('codigo', 'nombre', 'created_at', 'updated_at')


class TipoNormaViewSet(CatalogoViewSet):
    queryset = TipoNorma.objects.all()
    serializer_class = TipoNormaSerializer
    search_fields = ('codigo', 'nombre', 'descripcion')
    ordering_fields = ('codigo', 'nombre', 'created_at', 'updated_at')


class EfectoNormativoViewSet(CatalogoViewSet):
    queryset = EfectoNormativo.objects.all()
    serializer_class = EfectoNormativoSerializer
    search_fields = ('codigo', 'nombre', 'descripcion')
    ordering_fields = ('codigo', 'nombre', 'created_at', 'updated_at')


class EntidadEmisoraViewSet(CatalogoViewSet):
    queryset = EntidadEmisora.objects.all()
    serializer_class = EntidadEmisoraSerializer
    search_fields = ('sigla', 'nombre', 'descripcion')
    ordering_fields = ('sigla', 'nombre', 'created_at', 'updated_at')

# Create your views here.
