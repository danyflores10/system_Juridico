from django.contrib import admin, messages

from . import libelula, services
from .models import (
    Cliente,
    CredencialAcceso,
    DatosFacturacion,
    Pago,
    Plan,
    PrecioPlan,
    Suscripcion,
)


class PrecioPlanInline(admin.TabularInline):
    model = PrecioPlan
    extra = 0


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = [
        'nombre',
        'codigo',
        'dispositivos',
        'dispositivos_variables',
        'destacado',
        'orden',
        'activo',
    ]
    list_editable = ['destacado', 'orden', 'activo']
    inlines = [PrecioPlanInline]


class DatosFacturacionInline(admin.TabularInline):
    model = DatosFacturacion
    extra = 0


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = [
        'nombre_completo',
        'email',
        'whatsapp',
        'canal_contacto',
        'creado_en',
    ]
    search_fields = ['nombre_completo', 'email', 'whatsapp']
    list_filter = ['canal_contacto', 'genero']
    inlines = [DatosFacturacionInline]


class PagoInline(admin.TabularInline):
    model = Pago
    extra = 0
    can_delete = False
    fields = [
        'identificador',
        'metodo',
        'monto',
        'estado',
        'forma_pago',
        'creado_en',
        'pagado_en',
    ]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


class CredencialAccesoInline(admin.TabularInline):
    model = CredencialAcceso
    extra = 0
    can_delete = False
    fields = [
        'usuario',
        'estado',
        'password_inicial',
        'device_id',
        'vinculada_en',
    ]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Suscripcion)
class SuscripcionAdmin(admin.ModelAdmin):
    list_display = [
        'cliente',
        'plan',
        'periodicidad',
        'precio',
        'estado',
        'fecha_inicio',
        'fecha_fin',
    ]
    list_filter = ['estado', 'plan', 'periodicidad']
    search_fields = ['cliente__nombre_completo', 'cliente__email']
    date_hierarchy = 'creado_en'
    inlines = [PagoInline, CredencialAccesoInline]
    actions = ['habilitar_accesos_manual']

    @admin.action(
        description='Habilitar accesos (crear usuarios y contraseñas del plan)'
    )
    def habilitar_accesos_manual(self, request, queryset):
        """Habilitación manual (p. ej. Plan Empresarial cotizado aparte)."""
        total = 0
        for suscripcion in queryset.filter(
            estado=Suscripcion.Estado.ACTIVA
        ):
            total += len(services.habilitar_accesos(suscripcion))
        self.message_user(
            request,
            f'Credenciales existentes/creadas: {total}. Solo se procesan '
            'suscripciones ACTIVAS.',
            level=messages.SUCCESS,
        )


@admin.register(CredencialAcceso)
class CredencialAccesoAdmin(admin.ModelAdmin):
    list_display = [
        'usuario',
        'suscripcion',
        'estado',
        'vinculada_en',
        'creado_en',
    ]
    list_filter = ['estado']
    search_fields = ['usuario__email', 'suscripcion__cliente__email']
    readonly_fields = [
        'suscripcion',
        'usuario',
        'password_inicial',
        'device_id',
        'device_user_agent',
        'vinculada_en',
        'creado_en',
    ]
    actions = ['desvincular_dispositivo', 'bloquear', 'desbloquear']

    @admin.action(
        description='Desvincular dispositivo (permite un nuevo primer ingreso)'
    )
    def desvincular_dispositivo(self, request, queryset):
        actualizadas = queryset.update(
            device_id=None,
            device_user_agent='',
            vinculada_en=None,
            estado=CredencialAcceso.Estado.LIBRE,
        )
        self.message_user(
            request,
            f'{actualizadas} credencial(es) desvinculadas: el próximo inicio '
            'de sesión vinculará el nuevo dispositivo.',
            level=messages.SUCCESS,
        )

    @admin.action(description='Bloquear credencial')
    def bloquear(self, request, queryset):
        queryset.update(estado=CredencialAcceso.Estado.BLOQUEADA)

    @admin.action(description='Desbloquear credencial (queda vinculada)')
    def desbloquear(self, request, queryset):
        queryset.filter(estado=CredencialAcceso.Estado.BLOQUEADA).update(
            estado=CredencialAcceso.Estado.VINCULADA
        )


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = [
        'identificador',
        'suscripcion',
        'monto',
        'estado',
        'forma_pago',
        'creado_en',
        'pagado_en',
    ]
    list_filter = ['estado', 'metodo']
    search_fields = ['identificador', 'id_transaccion', 'codigo_recaudacion']
    date_hierarchy = 'creado_en'
    readonly_fields = [
        'identificador',
        'id_transaccion',
        'url_pasarela',
        'qr_simple_url',
        'codigo_recaudacion',
        'forma_pago',
        'factura_numero',
        'factura_url',
        'confirmacion',
        'creado_en',
        'pagado_en',
    ]
    actions = ['verificar_contra_libelula']

    @admin.action(description='Verificar pagos contra Libélula (conciliación)')
    def verificar_contra_libelula(self, request, queryset):
        confirmados = 0
        errores = 0
        for pago in queryset:
            try:
                actualizado = services.confirmar_pago_verificado(pago.pk)
            except libelula.LibelulaError:
                errores += 1
                continue
            if actualizado.estado == Pago.Estado.PAGADO:
                confirmados += 1
        if confirmados:
            self.message_user(
                request,
                f'{confirmados} pago(s) verificados como PAGADOS.',
                level=messages.SUCCESS,
            )
        if errores:
            self.message_user(
                request,
                f'{errores} pago(s) no se pudieron verificar (Libélula '
                'no disponible).',
                level=messages.WARNING,
            )
        if not confirmados and not errores:
            self.message_user(
                request,
                'Ningún pago cambió de estado.',
                level=messages.INFO,
            )
