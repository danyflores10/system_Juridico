from django.contrib import admin

from .models import EntidadEmisora, EfectoNormativo, Materia, TipoNorma


class CatalogoAdmin(admin.ModelAdmin):
    list_display = ('codigo_identificador', 'nombre', 'activo', 'updated_at')
    list_filter = ('activo',)
    search_fields = ('nombre', 'descripcion')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('nombre',)

    @admin.display(description='Código/Sigla', ordering='nombre')
    def codigo_identificador(self, obj):
        return getattr(obj, 'codigo', getattr(obj, 'sigla', ''))


@admin.register(Materia)
class MateriaAdmin(CatalogoAdmin):
    search_fields = ('codigo', 'nombre', 'descripcion')


@admin.register(TipoNorma)
class TipoNormaAdmin(CatalogoAdmin):
    search_fields = ('codigo', 'nombre', 'descripcion')


@admin.register(EfectoNormativo)
class EfectoNormativoAdmin(CatalogoAdmin):
    search_fields = ('codigo', 'nombre', 'descripcion')


@admin.register(EntidadEmisora)
class EntidadEmisoraAdmin(CatalogoAdmin):
    search_fields = ('sigla', 'nombre', 'descripcion')

# Register your models here.
