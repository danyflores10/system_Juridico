from django.contrib import admin

from .models import (
    ArchivoDocumento,
    Documento,
    HistorialDocumento,
    OrigenDocumento,
    PropuestaExtraccion,
    EvidenciaExtraccion,
    AlertaCalidad,
    CoincidenciaDocumento,
    EvaluacionCalidad,
    ResultadoConversion,
    ResultadoProcesamiento,
    TextoPagina,
    RevisionJuridica,
    CambioRevisionJuridica,
    DecisionAlertaRevision,
)


class ArchivoDocumentoInline(admin.TabularInline):
    model = ArchivoDocumento
    extra = 0
    can_delete = False
    readonly_fields = (
        'tipo_archivo', 'archivo', 'nombre_original', 'mime_type',
        'tamano_bytes', 'hash_sha256', 'created_at', 'created_by',
    )

    def has_add_permission(self, request, obj=None):
        return False


class OrigenDocumentoInline(admin.StackedInline):
    model = OrigenDocumento
    extra = 0


class HistorialDocumentoInline(admin.TabularInline):
    model = HistorialDocumento
    extra = 0
    can_delete = False
    readonly_fields = (
        'accion', 'estado_anterior', 'estado_nuevo', 'descripcion',
        'usuario', 'created_at',
    )

    def has_add_permission(self, request, obj=None):
        return False


class ResultadoProcesamientoInline(admin.StackedInline):
    model = ResultadoProcesamiento
    extra = 0
    can_delete = False
    readonly_fields = (
        'estado', 'tipo_pdf', 'tarea_id', 'numero_paginas',
        'paginas_con_texto', 'paginas_con_ocr', 'requirio_ocr',
        'ocr_aplicado', 'confianza_ocr', 'caracteres_extraidos',
        'intentos', 'iniciado_at', 'finalizado_at', 'duracion_ms',
        'error_codigo', 'error_mensaje', 'detalles_tecnicos',
        'created_at', 'updated_at',
    )

    def has_add_permission(self, request, obj=None):
        return False


class PropuestaExtraccionInline(admin.StackedInline):
    model = PropuestaExtraccion
    extra = 0
    can_delete = False
    readonly_fields = (
        'estado', 'tarea_id', 'tipo_norma_propuesto', 'numero_propuesto',
        'fecha_emision_propuesta', 'titulo_propuesto', 'objeto_propuesto',
        'efecto_normativo_propuesto', 'materia_propuesta',
        'entidad_emisora_propuesta', 'confianza_global', 'intentos',
        'iniciado_at', 'finalizado_at', 'duracion_ms', 'error_codigo',
        'error_mensaje', 'detalles_tecnicos', 'created_at', 'updated_at',
    )

    def has_add_permission(self, request, obj=None):
        return False


class EvaluacionCalidadInline(admin.StackedInline):
    model = EvaluacionCalidad
    fk_name = 'documento'
    extra = 0
    can_delete = False
    readonly_fields = (
        'estado', 'resultado', 'tarea_id', 'documento_coincidente',
        'hash_contenido', 'puntuacion_calidad', 'total_alertas',
        'alertas_leves', 'alertas_graves', 'intentos', 'iniciado_at',
        'finalizado_at', 'duracion_ms', 'error_codigo', 'error_mensaje',
        'metricas', 'created_at', 'updated_at',
    )

    def has_add_permission(self, request, obj=None):
        return False


class ResultadoConversionInline(admin.StackedInline):
    model = ResultadoConversion
    extra = 0
    can_delete = False
    readonly_fields = (
        'estado', 'tarea_id', 'nomenclatura_completa', 'nombre_archivo',
        'carpeta_materia', 'archivo', 'ruta_relativa', 'hash_sha256',
        'tamano_bytes', 'version', 'intentos', 'iniciado_at',
        'finalizado_at', 'duracion_ms', 'error_codigo', 'error_mensaje',
        'detalles_tecnicos', 'created_at', 'updated_at',
    )

    def has_add_permission(self, request, obj=None):
        return False


class RevisionJuridicaInline(admin.TabularInline):
    model = RevisionJuridica
    extra = 0
    can_delete = False
    readonly_fields = (
        'numero_revision', 'estado', 'revisado_por', 'observaciones',
        'motivo_devolucion', 'iniciada_at', 'finalizada_at',
    )

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = (
        'tipo_norma', 'numero', 'titulo', 'materia', 'estado',
        'fecha_emision', 'created_at',
    )
    list_filter = ('estado', 'tipo_norma', 'efecto_normativo', 'materia')
    search_fields = ('numero', 'titulo', 'objeto', 'uuid')
    readonly_fields = (
        'uuid', 'nomenclatura_preliminar', 'created_by',
        'created_at', 'updated_at', 'eliminado_at',
    )
    inlines = (
        OrigenDocumentoInline,
        ArchivoDocumentoInline,
        ResultadoProcesamientoInline,
        PropuestaExtraccionInline,
        EvaluacionCalidadInline,
        ResultadoConversionInline,
        RevisionJuridicaInline,
        HistorialDocumentoInline,
    )


@admin.register(ArchivoDocumento)
class ArchivoDocumentoAdmin(admin.ModelAdmin):
    list_display = (
        'documento', 'tipo_archivo', 'nombre_original',
        'tamano_bytes', 'created_at',
    )
    search_fields = ('documento__uuid', 'nombre_original', 'hash_sha256')
    readonly_fields = (
        'documento', 'tipo_archivo', 'archivo', 'nombre_original',
        'mime_type', 'tamano_bytes', 'hash_sha256', 'created_at', 'created_by',
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HistorialDocumento)
class HistorialDocumentoAdmin(admin.ModelAdmin):
    list_display = ('documento', 'accion', 'estado_nuevo', 'usuario', 'created_at')
    list_filter = ('accion', 'estado_nuevo')
    search_fields = ('documento__uuid', 'documento__titulo', 'descripcion')
    readonly_fields = (
        'documento', 'accion', 'estado_anterior', 'estado_nuevo',
        'descripcion', 'usuario', 'created_at',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ResultadoProcesamiento)
class ResultadoProcesamientoAdmin(admin.ModelAdmin):
    list_display = (
        'documento', 'estado', 'tipo_pdf', 'numero_paginas',
        'requirio_ocr', 'confianza_ocr', 'updated_at',
    )
    list_filter = ('estado', 'tipo_pdf', 'requirio_ocr', 'ocr_aplicado')
    search_fields = ('documento__codigo_interno', 'tarea_id', 'error_codigo')
    readonly_fields = [field.name for field in ResultadoProcesamiento._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TextoPagina)
class TextoPaginaAdmin(admin.ModelAdmin):
    list_display = (
        'resultado', 'numero_pagina', 'metodo', 'caracteres',
        'confianza_ocr',
    )
    list_filter = ('metodo',)
    search_fields = ('resultado__documento__codigo_interno', 'texto')
    readonly_fields = [field.name for field in TextoPagina._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PropuestaExtraccion)
class PropuestaExtraccionAdmin(admin.ModelAdmin):
    list_display = (
        'documento', 'estado', 'tipo_norma_propuesto', 'numero_propuesto',
        'materia_propuesta', 'confianza_global', 'updated_at',
    )
    list_filter = ('estado', 'tipo_norma_propuesto', 'materia_propuesta')
    search_fields = (
        'documento__codigo_interno', 'numero_propuesto', 'titulo_propuesto',
    )
    readonly_fields = [field.name for field in PropuestaExtraccion._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvidenciaExtraccion)
class EvidenciaExtraccionAdmin(admin.ModelAdmin):
    list_display = ('propuesta', 'campo', 'valor_propuesto', 'confianza', 'numero_pagina')
    list_filter = ('campo',)
    search_fields = ('propuesta__documento__codigo_interno', 'fragmento')
    readonly_fields = [field.name for field in EvidenciaExtraccion._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EvaluacionCalidad)
class EvaluacionCalidadAdmin(admin.ModelAdmin):
    list_display = (
        'documento', 'estado', 'resultado', 'puntuacion_calidad',
        'alertas_graves', 'alertas_leves', 'updated_at',
    )
    list_filter = ('estado', 'resultado')
    search_fields = ('documento__codigo_interno', 'error_codigo')
    readonly_fields = [field.name for field in EvaluacionCalidad._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AlertaCalidad)
class AlertaCalidadAdmin(admin.ModelAdmin):
    list_display = ('evaluacion', 'codigo', 'severidad', 'estado', 'created_at')
    list_filter = ('severidad', 'estado', 'codigo')
    search_fields = ('evaluacion__documento__codigo_interno', 'titulo', 'descripcion')
    readonly_fields = [field.name for field in AlertaCalidad._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(CoincidenciaDocumento)
class CoincidenciaDocumentoAdmin(admin.ModelAdmin):
    list_display = (
        'evaluacion', 'documento_coincidente', 'tipo',
        'similitud_titulo', 'similitud_contenido',
    )
    list_filter = ('tipo', 'misma_fecha', 'mismo_identificador')
    search_fields = (
        'evaluacion__documento__codigo_interno',
        'documento_coincidente__codigo_interno',
    )
    readonly_fields = [field.name for field in CoincidenciaDocumento._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ResultadoConversion)
class ResultadoConversionAdmin(admin.ModelAdmin):
    list_display = (
        'documento', 'estado', 'nombre_archivo', 'carpeta_materia',
        'version', 'tamano_bytes', 'updated_at',
    )
    list_filter = ('estado', 'carpeta_materia')
    search_fields = (
        'documento__codigo_interno', 'nombre_archivo', 'hash_sha256',
    )
    readonly_fields = [field.name for field in ResultadoConversion._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RevisionJuridica)
class RevisionJuridicaAdmin(admin.ModelAdmin):
    list_display = (
        'documento', 'numero_revision', 'estado', 'revisado_por',
        'iniciada_at', 'finalizada_at',
    )
    list_filter = ('estado', 'revisado_por')
    search_fields = ('documento__codigo_interno', 'observaciones')
    readonly_fields = [field.name for field in RevisionJuridica._meta.fields]


@admin.register(CambioRevisionJuridica)
class CambioRevisionJuridicaAdmin(admin.ModelAdmin):
    list_display = ('revision', 'campo', 'origen_valor', 'confianza_propuesta')
    list_filter = ('origen_valor', 'campo')
    readonly_fields = [field.name for field in CambioRevisionJuridica._meta.fields]


@admin.register(DecisionAlertaRevision)
class DecisionAlertaRevisionAdmin(admin.ModelAdmin):
    list_display = ('revision', 'alerta', 'decision', 'created_at')
    list_filter = ('decision',)
    readonly_fields = [field.name for field in DecisionAlertaRevision._meta.fields]
