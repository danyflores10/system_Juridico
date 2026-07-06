from django.urls import reverse
from django.conf import settings
from rest_framework import serializers

from apps.catalogos.models import (
    EfectoNormativo,
    EntidadEmisora,
    Materia,
    TipoNorma,
)

from .models import (
    ArchivoDocumento,
    Documento,
    HistorialDocumento,
    EvidenciaExtraccion,
    AlertaCalidad,
    CoincidenciaDocumento,
    EvaluacionCalidad,
    ResultadoConversion,
    PropuestaExtraccion,
    ResultadoProcesamiento,
    TextoPagina,
    CambioRevisionJuridica,
    DecisionAlertaRevision,
    OrigenDocumento,
    RevisionJuridica,
)
from .services import recibir_pdf_manual


class ArchivoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArchivoDocumento
        fields = ('id', 'tipo_archivo', 'nombre_original', 'mime_type', 'tamano_bytes', 'hash_sha256', 'created_at')


class HistorialDocumentoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.get_username', read_only=True)
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)

    class Meta:
        model = HistorialDocumento
        fields = ('id', 'accion', 'accion_display', 'estado_anterior', 'estado_nuevo', 'descripcion', 'usuario', 'usuario_nombre', 'created_at')
        read_only_fields = fields


class ResultadoProcesamientoResumenSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_pdf_display = serializers.CharField(source='get_tipo_pdf_display', read_only=True)

    class Meta:
        model = ResultadoProcesamiento
        fields = (
            'estado', 'estado_display', 'tipo_pdf', 'tipo_pdf_display',
            'tarea_id', 'numero_paginas', 'paginas_con_texto',
            'paginas_con_ocr', 'requirio_ocr', 'ocr_aplicado',
            'confianza_ocr', 'caracteres_extraidos', 'intentos',
            'iniciado_at', 'finalizado_at', 'duracion_ms', 'error_codigo',
            'error_mensaje', 'updated_at',
        )


class TextoPaginaSerializer(serializers.ModelSerializer):
    metodo_display = serializers.CharField(source='get_metodo_display', read_only=True)

    class Meta:
        model = TextoPagina
        fields = (
            'numero_pagina', 'metodo', 'metodo_display', 'texto',
            'caracteres', 'confianza_ocr',
        )


class ResultadoProcesamientoDetailSerializer(ResultadoProcesamientoResumenSerializer):
    paginas = TextoPaginaSerializer(many=True, read_only=True)
    archivo_procesado_url = serializers.SerializerMethodField()

    class Meta(ResultadoProcesamientoResumenSerializer.Meta):
        fields = ResultadoProcesamientoResumenSerializer.Meta.fields + (
            'detalles_tecnicos', 'paginas', 'archivo_procesado_url',
        )

    def get_archivo_procesado_url(self, obj):
        if not obj.documento.archivos.filter(
            tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_PROCESADO,
        ).exists():
            return None
        request = self.context.get('request')
        url = reverse(
            'documento-archivo-procesado',
            kwargs={'uuid': obj.documento.uuid},
        )
        return request.build_absolute_uri(url) if request else url


class CatalogoPropuestoSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    codigo = serializers.CharField(read_only=True)
    nombre = serializers.CharField(read_only=True)


class EntidadPropuestaSerializer(CatalogoPropuestoSerializer):
    sigla = serializers.CharField(read_only=True)


class EvidenciaExtraccionSerializer(serializers.ModelSerializer):
    campo_display = serializers.CharField(source='get_campo_display', read_only=True)

    class Meta:
        model = EvidenciaExtraccion
        fields = (
            'campo', 'campo_display', 'valor_propuesto', 'confianza',
            'numero_pagina', 'fragmento', 'regla_aplicada',
        )


class PropuestaExtraccionResumenSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = PropuestaExtraccion
        fields = (
            'estado', 'estado_display', 'tarea_id', 'confianza_global',
            'intentos', 'iniciado_at', 'finalizado_at', 'duracion_ms',
            'error_codigo', 'error_mensaje', 'updated_at',
        )


class PropuestaExtraccionDetailSerializer(PropuestaExtraccionResumenSerializer):
    tipo_norma_propuesto = CatalogoPropuestoSerializer(read_only=True)
    efecto_normativo_propuesto = CatalogoPropuestoSerializer(read_only=True)
    materia_propuesta = CatalogoPropuestoSerializer(read_only=True)
    entidad_emisora_propuesta = EntidadPropuestaSerializer(read_only=True)
    evidencias = EvidenciaExtraccionSerializer(many=True, read_only=True)

    class Meta(PropuestaExtraccionResumenSerializer.Meta):
        fields = PropuestaExtraccionResumenSerializer.Meta.fields + (
            'tipo_norma_propuesto', 'numero_propuesto',
            'fecha_emision_propuesta', 'titulo_propuesto',
            'objeto_propuesto', 'efecto_normativo_propuesto',
            'materia_propuesta', 'entidad_emisora_propuesta',
            'detalles_tecnicos', 'evidencias',
        )


class DocumentoCoincidenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documento
        fields = ('uuid', 'codigo_interno', 'estado', 'fecha_recepcion')


class AlertaCalidadSerializer(serializers.ModelSerializer):
    severidad_display = serializers.CharField(source='get_severidad_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    documento_relacionado = DocumentoCoincidenteSerializer(read_only=True)

    class Meta:
        model = AlertaCalidad
        fields = (
            'id', 'codigo', 'titulo', 'descripcion', 'severidad',
            'severidad_display', 'estado', 'estado_display',
            'documento_relacionado', 'evidencia', 'nota_resolucion',
            'resuelta_at', 'created_at',
        )


class CoincidenciaDocumentoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    documento_coincidente = DocumentoCoincidenteSerializer(read_only=True)

    class Meta:
        model = CoincidenciaDocumento
        fields = (
            'id', 'tipo', 'tipo_display', 'documento_coincidente',
            'similitud_titulo', 'similitud_contenido', 'misma_fecha',
            'mismo_identificador', 'detalles',
        )


class EvaluacionCalidadResumenSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    resultado_display = serializers.CharField(source='get_resultado_display', read_only=True)
    documento_coincidente = DocumentoCoincidenteSerializer(read_only=True)

    class Meta:
        model = EvaluacionCalidad
        fields = (
            'estado', 'estado_display', 'resultado', 'resultado_display',
            'tarea_id', 'documento_coincidente', 'puntuacion_calidad',
            'total_alertas', 'alertas_leves', 'alertas_graves', 'intentos',
            'iniciado_at', 'finalizado_at', 'duracion_ms', 'error_codigo',
            'error_mensaje', 'updated_at',
        )


class EvaluacionCalidadDetailSerializer(EvaluacionCalidadResumenSerializer):
    alertas = AlertaCalidadSerializer(many=True, read_only=True)
    coincidencias = CoincidenciaDocumentoSerializer(many=True, read_only=True)

    class Meta(EvaluacionCalidadResumenSerializer.Meta):
        fields = EvaluacionCalidadResumenSerializer.Meta.fields + (
            'hash_contenido', 'metricas', 'alertas', 'coincidencias',
        )


class ResultadoConversionResumenSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = ResultadoConversion
        fields = (
            'estado', 'estado_display', 'tarea_id', 'nomenclatura_completa',
            'nombre_archivo', 'carpeta_materia', 'ruta_relativa',
            'hash_sha256', 'tamano_bytes', 'version', 'intentos',
            'iniciado_at', 'finalizado_at', 'duracion_ms', 'error_codigo',
            'error_mensaje', 'updated_at',
        )


class ResultadoConversionDetailSerializer(ResultadoConversionResumenSerializer):
    archivo_url = serializers.SerializerMethodField()

    class Meta(ResultadoConversionResumenSerializer.Meta):
        fields = ResultadoConversionResumenSerializer.Meta.fields + (
            'detalles_tecnicos', 'archivo_url',
        )

    def get_archivo_url(self, obj):
        if not obj.archivo:
            return None
        request = self.context.get('request')
        url = reverse(
            'documento-archivo-word',
            kwargs={'uuid': obj.documento.uuid},
        )
        return request.build_absolute_uri(url) if request else url


class DocumentoListSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_origen_display = serializers.CharField(source='get_tipo_origen_display', read_only=True)
    nombre_archivo = serializers.SerializerMethodField()
    fecha_finalizacion = serializers.SerializerMethodField()

    class Meta:
        model = Documento
        fields = ('id', 'uuid', 'codigo_interno', 'tipo_origen', 'tipo_origen_display', 'estado', 'estado_display', 'nombre_archivo', 'fecha_recepcion', 'fecha_finalizacion', 'created_at')

    def get_nombre_archivo(self, obj):
        archivo = next(iter(obj.archivos.all()), None)
        return archivo.nombre_original if archivo else ''

    def get_fecha_finalizacion(self, obj):
        fecha_anotada = getattr(obj, 'fecha_finalizacion', None)
        if fecha_anotada:
            return fecha_anotada
        conversion = getattr(obj, 'resultado_conversion', None)
        return conversion.finalizado_at if conversion else None


class DocumentoDetailSerializer(DocumentoListSerializer):
    archivos = ArchivoDocumentoSerializer(many=True, read_only=True)
    historial = HistorialDocumentoSerializer(many=True, read_only=True)
    archivo_original_url = serializers.SerializerMethodField()
    procesamiento = ResultadoProcesamientoResumenSerializer(
        source='resultado_procesamiento',
        read_only=True,
        default=None,
    )
    extraccion = PropuestaExtraccionResumenSerializer(
        source='propuesta_extraccion',
        read_only=True,
        default=None,
    )
    calidad = EvaluacionCalidadResumenSerializer(
        source='evaluacion_calidad',
        read_only=True,
        default=None,
    )
    conversion = ResultadoConversionResumenSerializer(
        source='resultado_conversion',
        read_only=True,
        default=None,
    )

    class Meta(DocumentoListSerializer.Meta):
        fields = DocumentoListSerializer.Meta.fields + (
            'archivos', 'historial', 'archivo_original_url', 'procesamiento',
            'extraccion',
            'calidad', 'conversion', 'documento_canonico',
        )

    def get_archivo_original_url(self, obj):
        request = self.context.get('request')
        url = reverse('documento-archivo', kwargs={'uuid': obj.uuid})
        return request.build_absolute_uri(url) if request else url


class DocumentoUploadSerializer(serializers.Serializer):
    archivo = serializers.FileField(write_only=True)

    def create(self, validated_data):
        request = self.context.get('request')
        return recibir_pdf_manual(validated_data['archivo'], getattr(request, 'user', None))

    def to_representation(self, instance):
        return DocumentoDetailSerializer(instance, context=self.context).data


class CatalogoRevisionSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    codigo = serializers.CharField(read_only=True)
    nombre = serializers.CharField(read_only=True)
    sigla = serializers.CharField(read_only=True, required=False)


class CambioRevisionSerializer(serializers.ModelSerializer):
    origen_valor_display = serializers.CharField(
        source='get_origen_valor_display',
        read_only=True,
    )

    class Meta:
        model = CambioRevisionJuridica
        fields = (
            'id', 'campo', 'valor_anterior', 'valor_nuevo', 'origen_valor',
            'origen_valor_display', 'confianza_propuesta', 'evidencia',
            'created_at',
        )


class DecisionAlertaRevisionSerializer(serializers.ModelSerializer):
    decision_display = serializers.CharField(
        source='get_decision_display',
        read_only=True,
    )
    alerta_codigo = serializers.CharField(source='alerta.codigo', read_only=True)
    alerta_titulo = serializers.CharField(source='alerta.titulo', read_only=True)

    class Meta:
        model = DecisionAlertaRevision
        fields = (
            'id', 'alerta', 'alerta_codigo', 'alerta_titulo', 'decision',
            'decision_display', 'justificacion', 'created_at',
        )


class RevisionJuridicaSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    revisado_por_nombre = serializers.CharField(
        source='revisado_por.get_username',
        read_only=True,
    )
    cambios = CambioRevisionSerializer(many=True, read_only=True)
    decisiones_alertas = DecisionAlertaRevisionSerializer(many=True, read_only=True)

    class Meta:
        model = RevisionJuridica
        fields = (
            'id', 'numero_revision', 'estado', 'estado_display',
            'revisado_por', 'revisado_por_nombre', 'observaciones',
            'motivo_devolucion', 'ficha_anterior', 'ficha_aprobada',
            'iniciada_at', 'finalizada_at', 'updated_at', 'cambios',
            'decisiones_alertas',
        )


class OrigenRevisionSerializer(serializers.ModelSerializer):
    fuente_nombre = serializers.CharField(source='fuente.nombre', read_only=True)
    seccion_nombre = serializers.CharField(source='seccion.nombre', read_only=True)

    class Meta:
        model = OrigenDocumento
        fields = (
            'id', 'fuente', 'fuente_nombre', 'seccion', 'seccion_nombre',
            'url_origen', 'created_at',
        )


class DocumentoBandejaRevisionSerializer(DocumentoListSerializer):
    titulo_propuesto = serializers.CharField(
        source='propuesta_extraccion.titulo_propuesto',
        read_only=True,
        default='',
    )
    numero_propuesto = serializers.CharField(
        source='propuesta_extraccion.numero_propuesto',
        read_only=True,
        default='',
    )
    confianza_global = serializers.DecimalField(
        source='propuesta_extraccion.confianza_global',
        max_digits=5,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    resultado_calidad = serializers.CharField(
        source='evaluacion_calidad.resultado',
        read_only=True,
        default='',
    )
    puntuacion_calidad = serializers.DecimalField(
        source='evaluacion_calidad.puntuacion_calidad',
        max_digits=5,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    alertas_activas = serializers.SerializerMethodField()
    alertas_graves_activas = serializers.SerializerMethodField()
    campos_baja_confianza = serializers.SerializerMethodField()
    revision_activa = serializers.SerializerMethodField()

    class Meta(DocumentoListSerializer.Meta):
        fields = DocumentoListSerializer.Meta.fields + (
            'titulo_propuesto', 'numero_propuesto', 'confianza_global',
            'resultado_calidad', 'puntuacion_calidad', 'alertas_activas',
            'alertas_graves_activas', 'campos_baja_confianza',
            'revision_activa',
        )

    def get_alertas_activas(self, obj):
        try:
            return sum(
                alert.estado == AlertaCalidad.Estado.ACTIVA
                for alert in obj.evaluacion_calidad.alertas.all()
            )
        except EvaluacionCalidad.DoesNotExist:
            return 0

    def get_alertas_graves_activas(self, obj):
        try:
            return sum(
                alert.estado == AlertaCalidad.Estado.ACTIVA
                and alert.severidad == AlertaCalidad.Severidad.GRAVE
                for alert in obj.evaluacion_calidad.alertas.all()
            )
        except EvaluacionCalidad.DoesNotExist:
            return 0

    def get_campos_baja_confianza(self, obj):
        try:
            threshold = getattr(settings, 'QUALITY_MIN_EXTRACTION_CONFIDENCE', 70)
            return sum(
                float(evidence.confianza) < threshold
                for evidence in obj.propuesta_extraccion.evidencias.all()
            )
        except PropuestaExtraccion.DoesNotExist:
            return 0

    def get_revision_activa(self, obj):
        revision = next((
            item for item in obj.revisiones_juridicas.all()
            if item.estado == RevisionJuridica.Estado.EN_CURSO
        ), None)
        return RevisionJuridicaSerializer(revision).data if revision else None


class DocumentoRevisionDetailSerializer(serializers.ModelSerializer):
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    tipo_origen_display = serializers.CharField(source='get_tipo_origen_display', read_only=True)
    nombre_archivo = serializers.SerializerMethodField()
    archivo_original_url = serializers.SerializerMethodField()
    tipo_norma = CatalogoRevisionSerializer(read_only=True)
    efecto_normativo = CatalogoRevisionSerializer(read_only=True)
    materia = CatalogoRevisionSerializer(read_only=True)
    entidad_emisora = CatalogoRevisionSerializer(read_only=True)
    propuesta = PropuestaExtraccionDetailSerializer(
        source='propuesta_extraccion',
        read_only=True,
    )
    calidad = EvaluacionCalidadDetailSerializer(
        source='evaluacion_calidad',
        read_only=True,
    )
    historial = HistorialDocumentoSerializer(many=True, read_only=True)
    origenes = OrigenRevisionSerializer(many=True, read_only=True)
    revisiones = RevisionJuridicaSerializer(
        source='revisiones_juridicas',
        many=True,
        read_only=True,
    )

    class Meta:
        model = Documento
        fields = (
            'id', 'uuid', 'codigo_interno', 'tipo_origen',
            'tipo_origen_display', 'estado', 'estado_display',
            'nombre_archivo', 'archivo_original_url', 'fecha_recepcion',
            'tipo_norma', 'efecto_normativo', 'materia', 'entidad_emisora',
            'numero', 'fecha_emision', 'titulo', 'objeto', 'observaciones',
            'propuesta', 'calidad', 'historial', 'origenes', 'revisiones',
        )

    def get_nombre_archivo(self, obj):
        original = next((
            item for item in obj.archivos.all()
            if item.tipo_archivo == ArchivoDocumento.TipoArchivo.PDF_ORIGINAL
        ), None)
        return original.nombre_original if original else ''

    def get_archivo_original_url(self, obj):
        request = self.context.get('request')
        url = reverse('documento-archivo', kwargs={'uuid': obj.uuid})
        return request.build_absolute_uri(url) if request else url


class DecisionAlertaInputSerializer(serializers.Serializer):
    alerta_id = serializers.IntegerField(min_value=1)
    decision = serializers.ChoiceField(
        choices=DecisionAlertaRevision.Decision.choices,
    )
    justificacion = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=2000,
    )


class AprobarRevisionInputSerializer(serializers.Serializer):
    tipo_norma = serializers.PrimaryKeyRelatedField(
        queryset=TipoNorma.objects.filter(activo=True),
    )
    efecto_normativo = serializers.PrimaryKeyRelatedField(
        queryset=EfectoNormativo.objects.filter(activo=True),
    )
    materia = serializers.PrimaryKeyRelatedField(
        queryset=Materia.objects.filter(activo=True),
    )
    entidad_emisora = serializers.PrimaryKeyRelatedField(
        queryset=EntidadEmisora.objects.filter(activo=True),
    )
    numero = serializers.CharField(required=False, allow_blank=True, max_length=50)
    fecha_emision = serializers.DateField(required=False, allow_null=True)
    titulo = serializers.CharField(max_length=500)
    objeto = serializers.CharField()
    observaciones = serializers.CharField(required=False, allow_blank=True)
    observaciones_revision = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=5000,
    )
    decisiones_alertas = DecisionAlertaInputSerializer(many=True, required=False)

    def validate_decisiones_alertas(self, value):
        ids = [item['alerta_id'] for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError('No repita decisiones para una alerta.')
        return value


class DevolverRevisionInputSerializer(serializers.Serializer):
    motivo = serializers.CharField(min_length=10, max_length=5000)
