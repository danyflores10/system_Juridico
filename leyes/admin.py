from django.contrib import admin

from .models import LeyOriginal, LeyResultado, ModificacionDocumento


@admin.register(LeyOriginal)
class LeyOriginalAdmin(admin.ModelAdmin):
    list_display = (
        "codigo_ley",
        "titulo",
        "estado",
        "estado_proceso",
        "fecha_carga",
        "archivo_origen",
    )
    list_filter = ("estado", "estado_proceso")
    search_fields = ("codigo_ley", "titulo", "archivo_origen")
    readonly_fields = ("fecha_carga",)


@admin.register(ModificacionDocumento)
class ModificacionDocumentoAdmin(admin.ModelAdmin):
    list_display = (
        "archivo_origen",
        "codigo_ley_detectado",
        "ley_original",
        "palabras_clave_detectadas",
        "procesado",
        "fecha_carga",
    )
    list_filter = ("procesado",)
    search_fields = ("archivo_origen", "codigo_ley_detectado")
    raw_id_fields = ("ley_original",)


@admin.register(LeyResultado)
class LeyResultadoAdmin(admin.ModelAdmin):
    list_display = (
        "ley_original",
        "version",
        "es_version_final",
        "activo",
        "fecha_modificacion",
    )
    list_filter = ("es_version_final", "activo")
    raw_id_fields = ("ley_original",)
