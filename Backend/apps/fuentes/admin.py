from django.contrib import admin

from .models import EjecucionFuente, FuenteSeccion, FuenteWeb, HallazgoFuente


class FuenteSeccionInline(admin.TabularInline):
    model = FuenteSeccion
    extra = 0
    fields = ('codigo', 'nombre', 'url_listado', 'activa', 'orden')


@admin.register(FuenteWeb)
class FuenteWebAdmin(admin.ModelAdmin):
    list_display = (
        'codigo', 'nombre', 'tipo_fuente', 'motor_consulta', 'activa',
        'ultimo_estado_prueba', 'ultima_prueba_en',
    )
    list_filter = (
        'activa', 'tipo_fuente', 'motor_consulta', 'ultimo_estado_prueba',
    )
    search_fields = ('codigo', 'nombre', 'descripcion', 'url_base')
    ordering = ('orden', 'nombre')
    readonly_fields = (
        'ultimo_estado_prueba', 'ultima_prueba_en', 'ultimo_codigo_http',
        'ultimo_mensaje_prueba', 'ultimo_error_prueba',
        'created_at', 'updated_at',
    )
    inlines = (FuenteSeccionInline,)


@admin.register(FuenteSeccion)
class FuenteSeccionAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'fuente', 'activa', 'orden', 'updated_at')
    list_filter = ('activa', 'fuente')
    search_fields = ('codigo', 'nombre', 'descripcion', 'fuente__nombre')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(EjecucionFuente)
class EjecucionFuenteAdmin(admin.ModelAdmin):
    list_display = (
        'fuente', 'tipo_ejecucion', 'estado', 'inicio', 'fin', 'codigo_http',
    )
    list_filter = ('estado', 'tipo_ejecucion', 'fuente')
    search_fields = ('fuente__codigo', 'fuente__nombre', 'mensaje', 'detalle_error')
    readonly_fields = (
        'fuente', 'seccion', 'tipo_ejecucion', 'estado', 'inicio', 'fin',
        'codigo_http', 'documentos_encontrados', 'mensaje', 'detalle_error',
        'documentos_descargados', 'documentos_duplicados',
        'documentos_omitidos', 'total_errores', 'paginas_revisadas',
        'tarea_id', 'duracion_ms',
        'solicitado_por', 'created_at',
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(HallazgoFuente)
class HallazgoFuenteAdmin(admin.ModelAdmin):
    list_display = (
        'fuente', 'estado', 'nombre_archivo', 'documento',
        'codigo_http', 'tamano_bytes', 'created_at',
    )
    list_filter = ('estado', 'fuente', 'seccion')
    search_fields = (
        'titulo_encontrado', 'nombre_archivo', 'url',
        'documento__codigo_interno', 'hash_sha256',
    )
    readonly_fields = [field.name for field in HallazgoFuente._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
