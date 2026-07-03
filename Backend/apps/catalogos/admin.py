from django.contrib import admin

from .models import (
    EntidadEmisora,
    EfectoNormativo,
    Materia,
    PalabraClaveMateria,
    PatronTipoNorma,
    ReglaEfectoNormativo,
    TipoNorma,
)


@admin.action(description='Activar registros seleccionados')
def activar_registros(modeladmin, request, queryset):
    queryset.update(activo=True)


@admin.action(description='Desactivar registros seleccionados')
def desactivar_registros(modeladmin, request, queryset):
    if hasattr(queryset.model, 'documentos'):
        queryset = queryset.filter(documentos__isnull=True).distinct()
    queryset.update(activo=False)


class BaseCatalogoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'orden', 'activo', 'updated_at')
    list_filter = ('activo',)
    search_fields = ('codigo', 'nombre', 'descripcion')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('orden', 'nombre')
    actions = (activar_registros, desactivar_registros)


@admin.register(TipoNorma)
class TipoNormaAdmin(BaseCatalogoAdmin):
    list_display = BaseCatalogoAdmin.list_display + (
        'abreviatura_archivo', 'requiere_numero', 'requiere_fecha',
    )


@admin.register(EfectoNormativo)
class EfectoNormativoAdmin(BaseCatalogoAdmin):
    list_display = BaseCatalogoAdmin.list_display + (
        'abreviatura_archivo', 'es_efecto_final',
    )


@admin.register(Materia)
class MateriaAdmin(BaseCatalogoAdmin):
    list_display = BaseCatalogoAdmin.list_display + (
        'slug', 'carpeta_destino', 'requiere_revision',
    )


@admin.register(EntidadEmisora)
class EntidadEmisoraAdmin(BaseCatalogoAdmin):
    list_display = (
        'codigo', 'sigla', 'nombre', 'tipo_entidad', 'nivel',
        'orden', 'activo', 'updated_at',
    )
    list_filter = ('activo', 'tipo_entidad', 'nivel')
    search_fields = ('codigo', 'sigla', 'nombre', 'descripcion')


class BaseReglaAdmin(admin.ModelAdmin):
    list_filter = ('activo',)
    readonly_fields = ('created_at', 'updated_at')
    actions = (activar_registros, desactivar_registros)


@admin.register(PatronTipoNorma)
class PatronTipoNormaAdmin(BaseReglaAdmin):
    list_display = ('tipo_norma', 'patron_regex', 'prioridad', 'activo', 'updated_at')
    search_fields = ('tipo_norma__codigo', 'tipo_norma__nombre', 'patron_regex')
    list_filter = ('activo', 'tipo_norma')


@admin.register(PalabraClaveMateria)
class PalabraClaveMateriaAdmin(BaseReglaAdmin):
    list_display = ('materia', 'palabra_clave', 'peso', 'activo', 'updated_at')
    search_fields = ('materia__codigo', 'materia__nombre', 'palabra_clave')
    list_filter = ('activo', 'materia')


@admin.register(ReglaEfectoNormativo)
class ReglaEfectoNormativoAdmin(BaseReglaAdmin):
    list_display = (
        'efecto_normativo', 'expresion', 'prioridad', 'activo', 'updated_at',
    )
    search_fields = (
        'efecto_normativo__codigo', 'efecto_normativo__nombre', 'expresion',
    )
    list_filter = ('activo', 'efecto_normativo')
