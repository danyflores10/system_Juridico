"""Cliente HTTP para la pasarela de pagos Libélula (libelula.bo).

Implementa los servicios del manual de integración v2.145:
- REGISTRAR DEUDA:  POST /rest/deuda/registrar
- CONSULTAR DEUDAS POR IDENTIFICADOR: POST /rest/deuda/consultar_deudas/por_identificador

La confirmación de un pago NUNCA se toma del callback/redirección del
navegador: siempre se re-verifica server-to-server con la consulta por
identificador usando el appkey privado.
"""

import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class LibelulaError(Exception):
    """Error de comunicación o de negocio con la plataforma Libélula."""


def _post(path: str, payload: dict) -> dict:
    """POST JSON a Libélula devolviendo el cuerpo decodificado."""
    url = f"{settings.LIBELULA_API_BASE.rstrip('/')}{path}"
    try:
        respuesta = httpx.post(
            url,
            json=payload,
            timeout=settings.LIBELULA_TIMEOUT,
        )
        respuesta.raise_for_status()
        return respuesta.json()
    except httpx.HTTPError as exc:
        logger.error('Libélula no disponible en %s: %s', path, exc)
        raise LibelulaError(
            'No se pudo comunicar con la pasarela de pagos. '
            'Inténtalo nuevamente en unos minutos.'
        ) from exc
    except ValueError as exc:  # cuerpo no-JSON
        logger.error('Respuesta no JSON de Libélula en %s: %s', path, exc)
        raise LibelulaError(
            'La pasarela de pagos devolvió una respuesta inválida.'
        ) from exc


def registrar_deuda(pago, cliente, datos_facturacion=None) -> dict:
    """Registra la deuda del pago en Libélula y devuelve la respuesta.

    Devuelve el dict con `url_pasarela_pagos`, `id_transaccion` y
    opcionalmente `qr_simple_url`. Lanza LibelulaError si falla.
    """
    suscripcion = pago.suscripcion
    plan = suscripcion.plan
    concepto = (
        f'{plan.nombre} — Suscripción '
        f'{suscripcion.get_periodicidad_display().lower()}'
    )
    partes_nombre = cliente.nombre_completo.strip().split(None, 1)
    nombre = partes_nombre[0]
    apellido = partes_nombre[1] if len(partes_nombre) > 1 else ''

    identificador = str(pago.identificador)
    backend = settings.BACKEND_PUBLIC_URL.rstrip('/')
    frontend = settings.FRONTEND_PUBLIC_URL.rstrip('/')

    payload = {
        'appkey': settings.LIBELULA_APPKEY,
        'email_cliente': cliente.email,
        # El manual usa "identificador" en los ejemplos e
        # "identificador_deuda" en la tabla de parámetros: se envían ambos.
        'identificador': identificador,
        'identificador_deuda': identificador,
        'descripcion': concepto,
        'callback_url': (
            f'{backend}/api/v1/suscripciones/pagos/libelula/callback/'
            f'?pedido={identificador}'
        ),
        'url_retorno': f'{frontend}/planes/pago/{identificador}',
        'nombre_cliente': nombre,
        'apellido_cliente': apellido,
        'moneda': pago.moneda,
        'emite_factura': settings.LIBELULA_EMITE_FACTURA,
        'lineas_detalle_deuda': [
            {
                'concepto': concepto,
                'cantidad': 1,
                'costo_unitario': float(pago.monto),
                'descuento_unitario': 0,
            }
        ],
        'lineas_metadatos': [
            {'nombre': 'Plan', 'dato': plan.nombre},
            {
                'nombre': 'Periodicidad',
                'dato': suscripcion.get_periodicidad_display(),
            },
            {'nombre': 'Sistema', 'dato': 'Consultor Jurídico'},
        ],
    }

    if datos_facturacion is not None:
        codigo_tipo = (
            'NIT'
            if datos_facturacion.tipo_documento
            == type(datos_facturacion).TipoDocumento.NIT
            else 'CI'
        )
        payload.update(
            {
                'razon_social': datos_facturacion.nombre_o_razon_social,
                'numero_documento': datos_facturacion.numero_documento,
                'codigo_tipo_documento': codigo_tipo,
            }
        )
        if datos_facturacion.complemento:
            payload['complemento_documento'] = datos_facturacion.complemento
        if codigo_tipo == 'NIT':
            payload['nit'] = datos_facturacion.numero_documento
        else:
            payload['ci'] = datos_facturacion.numero_documento

    datos = _post('/rest/deuda/registrar', payload)
    if datos.get('error') or not datos.get('url_pasarela_pagos'):
        mensaje = datos.get('mensaje') or 'Libélula rechazó el registro de la deuda.'
        logger.error(
            'Libélula rechazó la deuda %s: %s', identificador, mensaje
        )
        raise LibelulaError(mensaje)
    return datos


def consultar_deuda(identificador: str) -> dict | None:
    """Consulta el estado real de una deuda por identificador propio.

    Devuelve el objeto `datos` de Libélula (con `pagado`, `valor_total`,
    `forma_pago`, `facturas`, …) o None si la deuda no existe.
    """
    respuesta = _post(
        '/rest/deuda/consultar_deudas/por_identificador',
        {
            'appkey': settings.LIBELULA_APPKEY,
            'identificador': identificador,
        },
    )
    if respuesta.get('error'):
        logger.warning(
            'Consulta de deuda %s sin resultado: %s',
            identificador,
            respuesta.get('mensaje'),
        )
        return None
    datos = respuesta.get('datos')
    # El servicio devuelve un objeto; se tolera una lista por robustez.
    if isinstance(datos, list):
        datos = datos[0] if datos else None
    return datos if isinstance(datos, dict) else None
