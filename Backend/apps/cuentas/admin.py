from django.contrib import admin

from .models import PerfilUsuario


@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'rol', 'creado_en', 'actualizado_en']
    list_filter = ['rol']
    search_fields = ['usuario__email', 'usuario__first_name', 'usuario__last_name']
