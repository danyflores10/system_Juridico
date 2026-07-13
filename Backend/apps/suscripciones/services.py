"""Lógica de negocio de suscripciones, confirmación de pagos y habilitación."""

import logging
import secrets
import uuid
from decimal import Decimal, InvalidOperation

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from . import libelula
from .models import CredencialAcceso, Pago, Suscripcion

logger = logging.getLogger(__name__)

User = get_user_model()

# Alfabeto sin caracteres ambiguos (sin 0/O, 1/l/I) para contraseñas legibles.
_ALFABETO_PASSWORD = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'


def _generar_password() -> str:
    """Contraseña fuerte y legible, p. ej. 'kR7m-Xp2q-9wTz' (14 caracteres)."""
    grupos = [
        ''.join(secrets.choice(_ALFABETO_PASSWORD) for _ in range(4))
        for _ in range(3)
    ]
    return '-'.join(grupos)


def _email_disponible(base: str, numero: int) -> str:
    """Variante única del email usando sub-direccionamiento (local+n@dominio).

    Los correos con '+n' llegan a la misma casilla del cliente, pero crean
    usuarios distintos (planes de 3 o N dispositivos).
    """
    local, _, dominio = base.partition('@')
    candidato = base if numero == 1 else f'{local}+{numero}@{dominio}'
    intento = numero
    while User.objects.filter(username__iexact=candidato).exists():
        intento += 1
        candidato = f'{local}+{intento}@{dominio}'
    return candidato


def habilitar_accesos(suscripcion: Suscripcion) -> list[CredencialAcceso]:
    """Habilitación inmediata (III): crea 1/3/N usuarios y contraseñas.

    Crea tantas credenciales como dispositivos tenga el plan pagado. Es
    idempotente: si la suscripción ya tiene credenciales, no crea más.
    """
    existentes = list(suscripcion.credenciales.all())
    if existentes:
        return existentes

    cliente = suscripcion.cliente
    partes = cliente.nombre_completo.strip().split(None, 1)
    nombre = partes[0][:150]
    apellido = (partes[1] if len(partes) > 1 else '')[:150]

    credenciales = []
    for n in range(1, suscripcion.dispositivos + 1):
        email = _email_disponible(cliente.email, n)
        password = _generar_password()
        usuario = User(
            username=email,
            email=email,
            first_name=nombre,
            last_name=apellido,
            is_active=True,
        )
        usuario.set_password(password)
        usuario.save()
        credenciales.append(
            CredencialAcceso.objects.create(
                suscripcion=suscripcion,
                usuario=usuario,
                password_inicial=password,
            )
        )

    if cliente.usuario_id is None and credenciales:
        cliente.usuario = credenciales[0].usuario
        cliente.save(update_fields=['usuario', 'actualizado_en'])

    logger.info(
        'Suscripción %s: %d credencial(es) habilitadas para %s.',
        suscripcion.pk,
        len(credenciales),
        cliente.email,
    )
    return credenciales


class DispositivoNoAutorizado(Exception):
    """El inicio de sesión no está permitido desde este dispositivo."""


def validar_dispositivo(usuario, device_id: str | None, user_agent: str = ''):
    """Aplica la regla '1 usuario y contraseña = 1 solo dispositivo'.

    - Usuarios sin credencial de suscripción (admins, cuentas internas) no
      se restringen.
    - Primer inicio de sesión: vincula la credencial al dispositivo y borra
      la contraseña inicial visible.
    - Siguientes inicios: el dispositivo debe ser el mismo; de lo contrario
      se rechaza (solo un administrador puede desvincular).
    """
    credencial = (
        CredencialAcceso.objects.select_related('suscripcion')
        .filter(usuario=usuario)
        .first()
    )
    if credencial is None:
        return

    if credencial.estado == CredencialAcceso.Estado.BLOQUEADA:
        raise DispositivoNoAutorizado(
            'Esta cuenta está bloqueada. Contacta a soporte.'
        )

    suscripcion = credencial.suscripcion
    ahora = timezone.now()
    if suscripcion.estado != Suscripcion.Estado.ACTIVA or (
        suscripcion.fecha_fin and suscripcion.fecha_fin < ahora
    ):
        raise DispositivoNoAutorizado(
            'Tu suscripción no está activa o ya venció. Renueva tu plan '
            'para volver a ingresar.'
        )

    try:
        device = uuid.UUID((device_id or '').strip())
    except ValueError:
        raise DispositivoNoAutorizado(
            'No se pudo identificar tu dispositivo. Ingresa desde el '
            'navegador donde usarás el sistema.'
        )

    if credencial.device_id is None:
        # Primer ingreso: el dispositivo queda vinculado de forma permanente.
        credencial.device_id = device
        credencial.device_user_agent = (user_agent or '')[:300]
        credencial.vinculada_en = ahora
        credencial.estado = CredencialAcceso.Estado.VINCULADA
        credencial.password_inicial = ''
        credencial.save(
            update_fields=[
                'device_id',
                'device_user_agent',
                'vinculada_en',
                'estado',
                'password_inicial',
            ]
        )
        return

    if credencial.device_id != device:
        raise DispositivoNoAutorizado(
            'Este usuario ya está habilitado en otro dispositivo y no '
            'puede usarse en uno distinto. Si cambiaste de equipo, '
            'contacta a soporte para desvincularlo.'
        )


def _monto_coincide(pago: Pago, datos: dict) -> bool:
    """Compara el monto local contra el `valor_total` reportado por Libélula."""
    try:
        valor_total = Decimal(str(datos.get('valor_total')))
    except (InvalidOperation, TypeError):
        return False
    return valor_total == pago.monto


def confirmar_pago_verificado(pago_id: int) -> Pago:
    """Confirma un pago verificándolo server-to-server contra Libélula.

    Es idempotente: si el pago ya está confirmado no hace nada. Solo marca
    el pago como PAGADO (y activa la suscripción) cuando la consulta por
    identificador — hecha con el appkey privado — reporta `pagado: true`
    y el monto coincide. Nunca se confía en los parámetros del callback.
    """
    with transaction.atomic():
        pago = (
            Pago.objects.select_for_update()
            .select_related('suscripcion__plan', 'suscripcion__cliente')
            .get(pk=pago_id)
        )
        if pago.estado == Pago.Estado.PAGADO:
            return pago

        datos = libelula.consultar_deuda(str(pago.identificador))
        if not datos:
            logger.warning(
                'Pago %s: Libélula no devolvió la deuda.', pago.identificador
            )
            return pago

        if not datos.get('pagado'):
            # Aún sin pagar: si además expiró, se refleja localmente.
            if datos.get('deuda_expirada') and pago.estado == Pago.Estado.PENDIENTE:
                pago.estado = Pago.Estado.EXPIRADO
                pago.confirmacion = datos
                pago.save(update_fields=['estado', 'confirmacion'])
            return pago

        if not _monto_coincide(pago, datos):
            # Pago reportado con monto distinto: se retiene para revisión
            # manual (no se activa nada automáticamente).
            pago.error_detalle = (
                'Monto reportado por Libélula distinto al esperado: '
                f"{datos.get('valor_total')!r} vs {pago.monto}."
            )
            pago.confirmacion = datos
            pago.save(update_fields=['error_detalle', 'confirmacion'])
            logger.error('Pago %s: %s', pago.identificador, pago.error_detalle)
            return pago

        ahora = timezone.now()
        pago.estado = Pago.Estado.PAGADO
        pago.pagado_en = ahora
        pago.forma_pago = str(datos.get('forma_pago') or '')[:80]
        pago.codigo_recaudacion = str(datos.get('codigo_recaudacion') or '')[:40]
        pago.confirmacion = datos
        pago.error_detalle = ''

        facturas = datos.get('facturas') or []
        if isinstance(facturas, list) and facturas and isinstance(facturas[0], dict):
            factura = facturas[0]
            pago.factura_numero = str(factura.get('numero_factura') or '')[:40]
            pago.factura_url = str(factura.get('url') or '')[:500]

        pago.save()

        suscripcion = pago.suscripcion
        if suscripcion.estado != suscripcion.Estado.ACTIVA:
            suscripcion.activar(ahora)
            suscripcion.save(
                update_fields=['estado', 'fecha_inicio', 'fecha_fin', 'actualizado_en']
            )
        # Habilitación inmediata (III): crea 1/3/N usuarios y contraseñas
        # según los dispositivos del plan (idempotente).
        habilitar_accesos(suscripcion)
        logger.info(
            'Pago %s confirmado (Bs%s, %s). Suscripción %s activa hasta %s.',
            pago.identificador,
            pago.monto,
            pago.forma_pago,
            suscripcion.pk,
            suscripcion.fecha_fin,
        )
        return pago
