from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from kombu.exceptions import OperationalError

from .filters import (
    EjecucionFuenteFilter,
    FuenteSeccionFilter,
    FuenteWebFilter,
    HallazgoFuenteFilter,
)
from .models import EjecucionFuente, FuenteSeccion, FuenteWeb, HallazgoFuente
from .permissions import FuenteAccessPermission
from .serializers import (
    EjecucionFuenteSerializer,
    FuenteSeccionSerializer,
    FuenteWebDetailSerializer,
    FuenteWebListSerializer,
    FuenteWebWriteSerializer,
    HallazgoFuenteSerializer,
)
from .services import probar_conexion_fuente
from .tasks import encolar_descarga_fuente


class QuerySearchMixin:
    q_fields = ()

    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.query_params.get('q', '').strip()
        if query and self.q_fields:
            condition = Q()
            for field in self.q_fields:
                condition |= Q(**{f'{field}__icontains': query})
            queryset = queryset.filter(condition)
        return queryset


class FuenteWebViewSet(QuerySearchMixin, viewsets.ModelViewSet):
    permission_classes = (FuenteAccessPermission,)
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = FuenteWebFilter
    search_fields = ('codigo', 'nombre', 'descripcion', 'url_base')
    q_fields = search_fields
    ordering_fields = (
        'codigo', 'nombre', 'orden', 'ultima_prueba_en',
        'ultimo_estado_prueba', 'created_at', 'updated_at',
    )
    ordering = ('orden', 'nombre')

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .select_related(
                'materia_predeterminada',
                'entidad_emisora_predeterminada',
            )
            .prefetch_related('secciones')
            .annotate(cantidad_secciones=Count('secciones', distinct=True))
        )

    queryset = FuenteWeb.objects.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return FuenteWebListSerializer
        if self.action == 'retrieve':
            return FuenteWebDetailSerializer
        return FuenteWebWriteSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=('post',))
    def activar(self, request, pk=None):
        fuente = self.get_object()
        fuente.activa = True
        fuente.save(update_fields=('activa', 'updated_at'))
        return Response(FuenteWebDetailSerializer(fuente).data)

    @action(detail=True, methods=('post',))
    def desactivar(self, request, pk=None):
        fuente = self.get_object()
        fuente.delete()
        return Response(FuenteWebDetailSerializer(fuente).data)

    @action(detail=True, methods=('post',), url_path='probar-conexion')
    def probar_conexion(self, request, pk=None):
        fuente = self.get_object()
        resultado = probar_conexion_fuente(fuente, request.user)
        return Response(resultado)

    @action(detail=True, methods=('post',), url_path='ejecutar-descarga')
    def ejecutar_descarga(self, request, pk=None):
        fuente = self.get_object()
        seccion = None
        seccion_id = request.data.get('seccion')
        if seccion_id not in (None, ''):
            try:
                seccion = fuente.secciones.get(pk=seccion_id, activa=True)
            except (FuenteSeccion.DoesNotExist, ValueError, TypeError):
                return Response(
                    {'detail': 'La sección indicada no pertenece a esta fuente.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        try:
            ejecucion = encolar_descarga_fuente(
                fuente,
                seccion=seccion,
                usuario=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except OperationalError:
            return Response(
                {'detail': 'No se pudo conectar con Redis para ejecutar la fuente.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            EjecucionFuenteSerializer(ejecucion).data,
            status=status.HTTP_202_ACCEPTED,
        )


class FuenteSeccionViewSet(QuerySearchMixin, viewsets.ModelViewSet):
    queryset = FuenteSeccion.objects.select_related(
        'fuente', 'materia_predeterminada',
    )
    serializer_class = FuenteSeccionSerializer
    permission_classes = (FuenteAccessPermission,)
    filter_backends = (
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    )
    filterset_class = FuenteSeccionFilter
    search_fields = ('codigo', 'nombre', 'descripcion', 'fuente__nombre')
    q_fields = search_fields
    ordering_fields = ('codigo', 'nombre', 'orden', 'created_at', 'updated_at')
    ordering = ('orden', 'nombre')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=('post',))
    def activar(self, request, pk=None):
        seccion = self.get_object()
        seccion.activa = True
        seccion.save(update_fields=('activa', 'updated_at'))
        return Response(self.get_serializer(seccion).data)

    @action(detail=True, methods=('post',))
    def desactivar(self, request, pk=None):
        seccion = self.get_object()
        seccion.delete()
        return Response(self.get_serializer(seccion).data)


class EjecucionFuenteViewSet(QuerySearchMixin, viewsets.ReadOnlyModelViewSet):
    queryset = EjecucionFuente.objects.select_related(
        'fuente', 'seccion', 'solicitado_por',
    )
    serializer_class = EjecucionFuenteSerializer
    permission_classes = (FuenteAccessPermission,)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_class = EjecucionFuenteFilter
    q_fields = ('fuente__codigo', 'fuente__nombre', 'mensaje', 'detalle_error')
    ordering_fields = ('inicio', 'fin', 'estado', 'codigo_http', 'created_at')
    ordering = ('-inicio', '-id')


class HallazgoFuenteViewSet(QuerySearchMixin, viewsets.ReadOnlyModelViewSet):
    queryset = HallazgoFuente.objects.select_related(
        'ejecucion', 'fuente', 'seccion', 'documento',
    )
    serializer_class = HallazgoFuenteSerializer
    permission_classes = (FuenteAccessPermission,)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_class = HallazgoFuenteFilter
    q_fields = (
        'titulo_encontrado', 'nombre_archivo', 'url',
        'documento__codigo_interno', 'mensaje', 'detalle_error',
    )
    ordering_fields = ('created_at', 'estado', 'tamano_bytes', 'codigo_http')
    ordering = ('-created_at', '-id')
