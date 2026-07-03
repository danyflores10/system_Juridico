from django.db.models import F, OuterRef, Q, Subquery
from django.conf import settings
from django.http import FileResponse
from django.views.decorators.clickjacking import xframe_options_exempt
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from kombu.exceptions import OperationalError

from .filters import DocumentoFilter, HistorialDocumentoFilter
from .models import (
    ArchivoDocumento,
    Documento,
    HistorialDocumento,
    PropuestaExtraccion,
    EvaluacionCalidad,
    ResultadoConversion,
    ResultadoProcesamiento,
)
from .permissions import DocumentoAccessPermission
from .serializers import (
    DocumentoDetailSerializer,
    DocumentoListSerializer,
    DocumentoUploadSerializer,
    HistorialDocumentoSerializer,
    ResultadoProcesamientoDetailSerializer,
    ResultadoProcesamientoResumenSerializer,
    PropuestaExtraccionDetailSerializer,
    PropuestaExtraccionResumenSerializer,
    EvaluacionCalidadDetailSerializer,
    EvaluacionCalidadResumenSerializer,
    ResultadoConversionDetailSerializer,
    ResultadoConversionResumenSerializer,
    AprobarRevisionInputSerializer,
    DevolverRevisionInputSerializer,
    DocumentoBandejaRevisionSerializer,
    DocumentoRevisionDetailSerializer,
    RevisionJuridicaSerializer,
)
from .services import descartar_documento
from .review import aprobar_revision, devolver_revision, iniciar_revision
from .tasks import (
    encolar_control_calidad,
    encolar_conversion,
    encolar_extraccion,
    encolar_procesamiento,
)


class DocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (DocumentoAccessPermission,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    lookup_field = 'uuid'
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_class = DocumentoFilter
    ordering_fields = (
        'codigo_interno', 'nombre_archivo_orden', 'tipo_origen', 'estado',
        'fecha_recepcion', 'fecha_finalizacion',
    )
    ordering = ('-fecha_recepcion',)

    def get_queryset(self):
        nombre_original = ArchivoDocumento.objects.filter(
            documento_id=OuterRef('pk'),
            tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL,
        ).order_by('created_at').values('nombre_original')[:1]
        queryset = Documento.objects.filter(eliminado_at__isnull=True).annotate(
            fecha_finalizacion=F('resultado_conversion__finalizado_at'),
            nombre_archivo_orden=Subquery(nombre_original),
        ).select_related(
            'resultado_procesamiento', 'propuesta_extraccion',
            'evaluacion_calidad', 'resultado_conversion',
            'documento_canonico',
        ).prefetch_related('archivos', 'historial__usuario')
        query = self.request.query_params.get('q', '').strip()
        if query:
            queryset = queryset.filter(Q(codigo_interno__icontains=query) | Q(archivos__nombre_original__icontains=query)).distinct()
        return queryset

    def get_serializer_class(self):
        return DocumentoListSerializer if self.action == 'list' else DocumentoDetailSerializer

    @action(detail=False, methods=('post',), url_path='upload', serializer_class=DocumentoUploadSerializer)
    def upload(self, request):
        serializer = DocumentoUploadSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        documento = serializer.save()
        return Response(DocumentoDetailSerializer(documento, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    def _revision_queryset(self):
        return Documento.objects.filter(
            eliminado_at__isnull=True,
            estado__in=(
                Documento.Estado.PENDIENTE_APROBACION,
                Documento.Estado.PENDIENTE_REVISION_RAPIDA,
                Documento.Estado.OBSERVADO,
                Documento.Estado.LISTO_PARA_CONVERSION,
                Documento.Estado.ERROR_CONVERSION,
            ),
        ).select_related(
            'propuesta_extraccion', 'evaluacion_calidad',
            'tipo_norma', 'efecto_normativo', 'materia', 'entidad_emisora',
        ).prefetch_related(
            'archivos', 'propuesta_extraccion__evidencias',
            'evaluacion_calidad__alertas', 'revisiones_juridicas',
        )

    @action(detail=False, methods=('get',), url_path='bandeja-revision')
    def bandeja_revision(self, request):
        queryset = self._revision_queryset()
        query = request.query_params.get('q', '').strip()
        if query:
            queryset = queryset.filter(
                Q(codigo_interno__icontains=query)
                | Q(archivos__nombre_original__icontains=query)
                | Q(propuesta_extraccion__titulo_propuesto__icontains=query)
                | Q(propuesta_extraccion__numero_propuesto__icontains=query)
            ).distinct()
        view = request.query_params.get('vista', '').upper()
        if view == 'LISTOS':
            queryset = queryset.filter(
                estado=Documento.Estado.PENDIENTE_APROBACION,
            )
        elif view == 'ALERTAS':
            queryset = queryset.filter(
                evaluacion_calidad__alertas__estado='ACTIVA',
            ).distinct()
        elif view == 'BAJA_CONFIANZA':
            threshold = getattr(settings, 'QUALITY_MIN_EXTRACTION_CONFIDENCE', 70)
            queryset = queryset.filter(
                propuesta_extraccion__evidencias__confianza__lt=threshold,
            ).distinct()
        queryset = queryset.order_by(
            '-evaluacion_calidad__alertas_graves',
            '-evaluacion_calidad__alertas_leves',
            'fecha_recepcion',
        )
        page = self.paginate_queryset(queryset)
        serializer = DocumentoBandejaRevisionSerializer(
            page if page is not None else queryset,
            many=True,
            context=self.get_serializer_context(),
        )
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    def _documento_revision(self):
        return Documento.objects.filter(
            eliminado_at__isnull=True,
        ).select_related(
            'propuesta_extraccion', 'evaluacion_calidad',
            'tipo_norma', 'efecto_normativo', 'materia', 'entidad_emisora',
        ).prefetch_related(
            'archivos', 'propuesta_extraccion__evidencias',
            'evaluacion_calidad__alertas',
            'historial__usuario', 'origenes__fuente', 'origenes__seccion',
            'evaluacion_calidad__coincidencias__documento_coincidente',
            'revisiones_juridicas__cambios',
            'revisiones_juridicas__decisiones_alertas__alerta',
            'revisiones_juridicas__revisado_por',
        ).get(uuid=self.kwargs['uuid'])

    @action(detail=True, methods=('get',), url_path='revision-juridica')
    def revision_juridica(self, request, uuid=None):
        documento = self._documento_revision()
        return Response(DocumentoRevisionDetailSerializer(
            documento,
            context=self.get_serializer_context(),
        ).data)

    @action(detail=True, methods=('post',), url_path='iniciar-revision')
    def iniciar_revision_juridica(self, request, uuid=None):
        documento = self.get_object()
        revision = iniciar_revision(documento.pk, request.user)
        return Response(
            RevisionJuridicaSerializer(revision).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=('post',), url_path='aprobar-revision')
    def aprobar_revision_juridica(self, request, uuid=None):
        serializer = AprobarRevisionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        decisions = data.pop('decisiones_alertas', [])
        revision = aprobar_revision(
            self.get_object().pk,
            data,
            decisions,
            request.user,
        )
        return Response(RevisionJuridicaSerializer(revision).data)

    @action(detail=True, methods=('post',), url_path='devolver-revision')
    def devolver_revision_juridica(self, request, uuid=None):
        serializer = DevolverRevisionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        revision = devolver_revision(
            self.get_object().pk,
            serializer.validated_data['motivo'],
            request.user,
        )
        return Response(RevisionJuridicaSerializer(revision).data)

    @action(detail=True, methods=('get',), url_path='archivo')
    @xframe_options_exempt
    def archivo(self, request, uuid=None):
        registro = self.get_object().archivos.filter(tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL).first()
        if not registro:
            return Response({'detail': 'El documento no tiene un PDF original.'}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(registro.archivo.open('rb'), content_type='application/pdf', as_attachment=request.query_params.get('download') == '1', filename=registro.nombre_original)

    @action(detail=True, methods=('post',), url_path='descartar')
    def descartar(self, request, uuid=None):
        descartar_documento(self.get_object(), request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _encolar(self, request):
        documento = self.get_object()
        try:
            resultado = encolar_procesamiento(documento)
        except ValueError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except OperationalError:
            return Response(
                {
                    'detail': (
                        'No se pudo conectar con Redis. El documento permanece '
                        'pendiente y puede reintentarse.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            ResultadoProcesamientoResumenSerializer(
                resultado,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=('post',), url_path='procesar')
    def procesar(self, request, uuid=None):
        return self._encolar(request)

    @action(detail=True, methods=('post',), url_path='reintentar-procesamiento')
    def reintentar_procesamiento(self, request, uuid=None):
        return self._encolar(request)

    @action(detail=True, methods=('get',), url_path='resultado-procesamiento')
    def resultado_procesamiento(self, request, uuid=None):
        try:
            resultado = self.get_object().resultado_procesamiento
        except ResultadoProcesamiento.DoesNotExist:
            return Response(
                {'detail': 'El documento todavía no tiene un procesamiento.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        resultado = ResultadoProcesamiento.objects.prefetch_related(
            'paginas', 'documento__archivos',
        ).get(pk=resultado.pk)
        return Response(
            ResultadoProcesamientoDetailSerializer(
                resultado,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=True, methods=('get',), url_path='archivo-procesado')
    @xframe_options_exempt
    def archivo_procesado(self, request, uuid=None):
        registro = self.get_object().archivos.filter(
            tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_PROCESADO,
        ).first()
        if not registro:
            return Response(
                {'detail': 'El documento todavía no tiene un PDF procesado.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(
            registro.archivo.open('rb'),
            content_type='application/pdf',
            as_attachment=request.query_params.get('download') == '1',
            filename=registro.nombre_original,
        )

    def _encolar_extraccion(self, request):
        try:
            propuesta = encolar_extraccion(self.get_object())
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except OperationalError:
            return Response(
                {
                    'detail': (
                        'No se pudo conectar con Redis. El documento permanece '
                        'pendiente de extracción y puede reintentarse.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            PropuestaExtraccionResumenSerializer(
                propuesta,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=('post',), url_path='extraer-datos')
    def extraer_datos(self, request, uuid=None):
        return self._encolar_extraccion(request)

    @action(detail=True, methods=('post',), url_path='reintentar-extraccion')
    def reintentar_extraccion(self, request, uuid=None):
        return self._encolar_extraccion(request)

    @action(detail=True, methods=('get',), url_path='propuesta-extraccion')
    def propuesta_extraccion(self, request, uuid=None):
        try:
            propuesta = self.get_object().propuesta_extraccion
        except PropuestaExtraccion.DoesNotExist:
            return Response(
                {'detail': 'El documento todavía no tiene una propuesta jurídica.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        propuesta = PropuestaExtraccion.objects.select_related(
            'tipo_norma_propuesto', 'efecto_normativo_propuesto',
            'materia_propuesta', 'entidad_emisora_propuesta',
        ).prefetch_related('evidencias').get(pk=propuesta.pk)
        return Response(
            PropuestaExtraccionDetailSerializer(
                propuesta,
                context=self.get_serializer_context(),
            ).data
        )

    def _encolar_calidad(self, request):
        try:
            evaluacion = encolar_control_calidad(self.get_object())
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except OperationalError:
            return Response(
                {
                    'detail': (
                        'No se pudo conectar con Redis. El control de calidad '
                        'puede reintentarse sin perder los resultados previos.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            EvaluacionCalidadResumenSerializer(
                evaluacion,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=('post',), url_path='control-calidad')
    def control_calidad(self, request, uuid=None):
        return self._encolar_calidad(request)

    @action(detail=True, methods=('post',), url_path='reintentar-calidad')
    def reintentar_calidad(self, request, uuid=None):
        return self._encolar_calidad(request)

    @action(detail=True, methods=('get',), url_path='resultado-calidad')
    def resultado_calidad(self, request, uuid=None):
        try:
            evaluacion = self.get_object().evaluacion_calidad
        except EvaluacionCalidad.DoesNotExist:
            return Response(
                {'detail': 'El documento todavía no tiene control de calidad.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        evaluacion = EvaluacionCalidad.objects.select_related(
            'documento_coincidente',
        ).prefetch_related(
            'alertas__documento_relacionado',
            'coincidencias__documento_coincidente',
        ).get(pk=evaluacion.pk)
        return Response(
            EvaluacionCalidadDetailSerializer(
                evaluacion,
                context=self.get_serializer_context(),
            ).data
        )

    def _encolar_conversion(self, request):
        try:
            resultado = encolar_conversion(self.get_object())
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_409_CONFLICT)
        except OperationalError:
            return Response(
                {
                    'detail': (
                        'No se pudo conectar con Redis. La conversión puede '
                        'reintentarse sin perder los archivos anteriores.'
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            ResultadoConversionResumenSerializer(
                resultado,
                context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=('post',), url_path='convertir-word')
    def convertir_word(self, request, uuid=None):
        return self._encolar_conversion(request)

    @action(detail=True, methods=('post',), url_path='reintentar-conversion')
    def reintentar_conversion(self, request, uuid=None):
        return self._encolar_conversion(request)

    @action(detail=True, methods=('get',), url_path='resultado-conversion')
    def resultado_conversion(self, request, uuid=None):
        try:
            resultado = self.get_object().resultado_conversion
        except ResultadoConversion.DoesNotExist:
            return Response(
                {'detail': 'El documento todavía no tiene conversión final.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            ResultadoConversionDetailSerializer(
                resultado,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=True, methods=('get',), url_path='archivo-word')
    def archivo_word(self, request, uuid=None):
        try:
            resultado = self.get_object().resultado_conversion
        except ResultadoConversion.DoesNotExist:
            resultado = None
        if not resultado or not resultado.archivo:
            return Response(
                {'detail': 'El documento todavía no tiene un Word final.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not resultado.archivo.storage.exists(resultado.archivo.name):
            return Response(
                {'detail': 'El archivo Word no está disponible en el almacenamiento.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return FileResponse(
            resultado.archivo.open('rb'),
            content_type=(
                'application/vnd.openxmlformats-officedocument.'
                'wordprocessingml.document'
            ),
            as_attachment=True,
            filename=resultado.nombre_archivo,
        )


class HistorialDocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialDocumento.objects.select_related('documento', 'usuario')
    serializer_class = HistorialDocumentoSerializer
    permission_classes = (DocumentoAccessPermission,)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    filterset_class = HistorialDocumentoFilter
    ordering = ('-created_at', '-id')
