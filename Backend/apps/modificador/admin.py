from django.contrib import admin

from .models import LeyOriginal, LeyResultado, ModificacionDocumento


@admin.register(LeyOriginal)
class LeyOriginalAdmin(admin.ModelAdmin):
    list_display = ('codigo_ley', 'titulo', 'estado', 'estado_proceso', 'fecha_carga')
    list_filter = ('estado', 'estado_proceso')
    search_fields = ('codigo_ley', 'titulo', 'archivo_origen')


@admin.register(ModificacionDocumento)
class ModificacionDocumentoAdmin(admin.ModelAdmin):
    list_display = (
        'archivo_origen',
        'codigo_ley_detectado',
        'estado_vinculacion',
        'procesado',
        'fecha_carga',
    )
    list_filter = ('estado_vinculacion', 'procesado')
    search_fields = ('archivo_origen', 'codigo_ley_detectado')


@admin.register(LeyResultado)
class LeyResultadoAdmin(admin.ModelAdmin):
    list_display = (
        'ley_original',
        'version',
        'es_version_final',
        'activo',
        'fecha_modificacion',
    )
    list_filter = ('activo', 'es_version_final')
    search_fields = ('ley_original__codigo_ley', 'ley_original__titulo')
