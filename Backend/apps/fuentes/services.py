from urllib.parse import urljoin

import httpx
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone

from apps.normativa.models import OrigenDocumento
from apps.normativa.services import recibir_pdf_automatico
from apps.normativa.tasks import encolar_procesamiento

from .models import EjecucionFuente, FuenteWeb, HallazgoFuente
from .scraping import (
    ErrorDescubrimiento,
    descargar_pdf,
    descubrir_enlaces,
    obtener_listado,
    obtener_listado_playwright,
)
from .validators import validar_url_fuente


MAX_REDIRECCIONES = 5


def _obtener_respuesta_segura(url):
    current_url = url
    with httpx.Client(
        timeout=15.0,
        follow_redirects=False,
        headers={'User-Agent': 'Sistema-Consultor-Juridico/1.0'},
    ) as client:
        for _ in range(MAX_REDIRECCIONES + 1):
            validar_url_fuente(current_url)
            response = client.get(current_url)
            if not response.is_redirect:
                return response
            location = response.headers.get('location')
            if not location:
                return response
            current_url = urljoin(str(response.url), location)
    raise httpx.TooManyRedirects('La fuente excedió el máximo de redirecciones.')


def probar_conexion_fuente(fuente, usuario=None):
    inicio = timezone.now()
    ejecucion = EjecucionFuente.objects.create(
        fuente=fuente,
        tipo_ejecucion=EjecucionFuente.TipoEjecucion.PRUEBA_CONEXION,
        estado=EjecucionFuente.Estado.EN_PROCESO,
        inicio=inicio,
        solicitado_por=usuario if getattr(usuario, 'is_authenticated', False) else None,
        )
    codigo_http = None
    try:
        url = fuente.url_consulta_principal or fuente.url_base
        # La prueba rápida solo verifica disponibilidad HTTP. El renderizado
        # Chromium se ejecuta de forma aislada dentro del worker Celery.
        response = _obtener_respuesta_segura(url)
        codigo_http = response.status_code
        if codigo_http >= 400:
            raise RuntimeError(f'La fuente respondió con HTTP {codigo_http}.')
        if hasattr(response, 'raise_for_status'):
            response.raise_for_status()
        estado_fuente = FuenteWeb.EstadoPrueba.DISPONIBLE
        estado_ejecucion = EjecucionFuente.Estado.EXITOSA
        mensaje = 'La fuente respondió correctamente.'
        detalle_error = ''
    except (
        httpx.HTTPError,
        ValidationError,
        RuntimeError,
        ErrorDescubrimiento,
    ) as exc:
        estado_fuente = FuenteWeb.EstadoPrueba.ERROR
        estado_ejecucion = EjecucionFuente.Estado.ERROR
        mensaje = 'No fue posible conectar con la fuente.'
        detalle_error = str(exc)

    fin = timezone.now()
    fuente.ultimo_estado_prueba = estado_fuente
    fuente.ultima_prueba_en = fin
    fuente.ultimo_codigo_http = codigo_http
    fuente.ultimo_mensaje_prueba = mensaje
    fuente.ultimo_error_prueba = detalle_error
    fuente.save(
        update_fields=(
            'ultimo_estado_prueba',
            'ultima_prueba_en',
            'ultimo_codigo_http',
            'ultimo_mensaje_prueba',
            'ultimo_error_prueba',
            'updated_at',
        )
    )
    ejecucion.estado = estado_ejecucion
    ejecucion.fin = fin
    ejecucion.codigo_http = codigo_http
    ejecucion.mensaje = mensaje
    ejecucion.detalle_error = detalle_error
    ejecucion.save(
        update_fields=(
            'estado', 'fin', 'codigo_http', 'mensaje', 'detalle_error',
        )
    )
    return {
        'estado': estado_fuente,
        'codigo_http': codigo_http,
        'mensaje': mensaje,
        'ejecucion_id': ejecucion.pk,
    }


def crear_ejecucion_descarga(
    fuente,
    *,
    seccion=None,
    usuario=None,
    tipo=EjecucionFuente.TipoEjecucion.EJECUCION_MANUAL,
):
    if not fuente.activa:
        raise ValueError('La fuente está desactivada.')
    if fuente.requiere_autenticacion:
        raise ValueError(
            'La descarga autenticada requiere un adaptador específico para esta fuente.'
        )
    if seccion and (seccion.fuente_id != fuente.pk or not seccion.activa):
        raise ValueError('La sección no pertenece a la fuente o está desactivada.')
    return EjecucionFuente.objects.create(
        fuente=fuente,
        seccion=seccion,
        tipo_ejecucion=tipo,
        estado=EjecucionFuente.Estado.EN_PROCESO,
        inicio=timezone.now(),
        solicitado_por=(
            usuario if getattr(usuario, 'is_authenticated', False) else None
        ),
        mensaje='Ejecución creada y pendiente de descubrimiento.',
    )


def _destinos_ejecucion(ejecucion):
    fuente = ejecucion.fuente
    if ejecucion.seccion_id:
        return ((ejecucion.seccion, ejecucion.seccion.url_busqueda or ejecucion.seccion.url_listado),)
    secciones = list(fuente.secciones.filter(activa=True).order_by('orden', 'id'))
    if secciones:
        return tuple((item, item.url_busqueda or item.url_listado) for item in secciones)
    return ((None, fuente.url_consulta_principal or fuente.url_base),)


def _configuracion(fuente, seccion):
    config = dict(fuente.configuracion or {})
    if seccion:
        config.update(seccion.configuracion or {})
    return config


def _marcar_hallazgo(hallazgo, estado, **values):
    hallazgo.estado = estado
    for field, value in values.items():
        setattr(hallazgo, field, value)
    hallazgo.save(update_fields=('estado', *values.keys()))


def ejecutar_descarga_fuente(ejecucion_id):
    ejecucion = EjecucionFuente.objects.select_related(
        'fuente', 'seccion',
    ).get(pk=ejecucion_id)
    fuente = ejecucion.fuente
    encontrados = descargados = duplicados = omitidos = errores = paginas = 0
    ultimo_codigo_http = None
    errores_generales = []

    try:
        if not fuente.activa:
            raise ErrorDescubrimiento('La fuente fue desactivada antes de ejecutarse.')
        for seccion, listado_url in _destinos_ejecucion(ejecucion):
            config = _configuracion(fuente, seccion)
            try:
                if fuente.motor_consulta == FuenteWeb.MotorConsulta.PLAYWRIGHT:
                    response = obtener_listado_playwright(listado_url, config)
                else:
                    response = obtener_listado(listado_url)
                paginas += 1
                ultimo_codigo_http = response.status_code
                enlaces = descubrir_enlaces(response, str(response.url), config)
                if (
                    not enlaces
                    and fuente.motor_consulta == FuenteWeb.MotorConsulta.HTTPX
                    and config.get('deteccion_automatica', True)
                ):
                    rendered = obtener_listado_playwright(listado_url, config)
                    paginas += 1
                    enlaces = descubrir_enlaces(
                        rendered,
                        str(rendered.url),
                        config,
                    )
                    if enlaces:
                        fuente.motor_consulta = FuenteWeb.MotorConsulta.PLAYWRIGHT
                        fuente.requiere_javascript = True
                        fuente.save(update_fields=(
                            'motor_consulta',
                            'requiere_javascript',
                            'updated_at',
                        ))
            except (httpx.HTTPError, ValidationError, ErrorDescubrimiento) as exc:
                errores += 1
                errores_generales.append(f'{listado_url}: {exc}')
                continue

            max_items = int(config.get('max_documentos_por_ejecucion', 50))
            max_items = max(1, min(max_items, 500))
            for enlace in enlaces[:max_items]:
                encontrados += 1
                hallazgo = HallazgoFuente.objects.create(
                    ejecucion=ejecucion,
                    fuente=fuente,
                    seccion=seccion,
                    url=enlace.url,
                    titulo_encontrado=enlace.titulo,
                )

                origen = OrigenDocumento.objects.select_related('documento').filter(
                    fuente=fuente,
                    seccion=seccion,
                    url_origen=enlace.url,
                    documento__eliminado_at__isnull=True,
                ).first()
                if origen:
                    duplicados += 1
                    _marcar_hallazgo(
                        hallazgo,
                        HallazgoFuente.Estado.DUPLICADO,
                        documento=origen.documento,
                        mensaje='La URL ya fue registrada anteriormente.',
                    )
                    continue

                try:
                    remoto = descargar_pdf(enlace.url)
                    upload = SimpleUploadedFile(
                        remoto.nombre_archivo,
                        remoto.contenido,
                        content_type='application/pdf',
                    )
                    documento, creado, digest = recibir_pdf_automatico(
                        upload,
                        fuente,
                        enlace.url,
                        seccion,
                    )
                    if creado:
                        descargados += 1
                        mensaje = 'PDF nuevo recibido y enviado al flujo técnico.'
                        try:
                            encolar_procesamiento(documento)
                        except Exception as exc:
                            mensaje = (
                                'PDF recibido; no se pudo encolar el procesamiento: '
                                f'{exc}'
                            )
                        estado_hallazgo = HallazgoFuente.Estado.DESCARGADO
                    else:
                        duplicados += 1
                        mensaje = 'El archivo ya existía; se registró el origen adicional.'
                        estado_hallazgo = HallazgoFuente.Estado.DUPLICADO
                    _marcar_hallazgo(
                        hallazgo,
                        estado_hallazgo,
                        documento=documento,
                        nombre_archivo=remoto.nombre_archivo,
                        codigo_http=remoto.codigo_http,
                        mime_type=remoto.mime_type,
                        tamano_bytes=len(remoto.contenido),
                        hash_sha256=digest,
                        mensaje=mensaje,
                    )
                except (httpx.HTTPError, ValidationError, ErrorDescubrimiento) as exc:
                    errores += 1
                    _marcar_hallazgo(
                        hallazgo,
                        HallazgoFuente.Estado.ERROR,
                        detalle_error=str(exc),
                        mensaje='No se pudo recibir el PDF encontrado.',
                    )
                except Exception as exc:
                    errores += 1
                    _marcar_hallazgo(
                        hallazgo,
                        HallazgoFuente.Estado.ERROR,
                        detalle_error=str(exc),
                        mensaje='Ocurrió un error inesperado al registrar el PDF.',
                    )

        if errores and not (descargados or duplicados):
            estado = EjecucionFuente.Estado.ERROR
        elif errores:
            estado = EjecucionFuente.Estado.PARCIAL
        else:
            estado = EjecucionFuente.Estado.EXITOSA
        mensaje = (
            f'Revisión terminada: {encontrados} encontrados, '
            f'{descargados} nuevos y {duplicados} duplicados.'
        )
    except Exception as exc:
        estado = EjecucionFuente.Estado.ERROR
        errores += 1
        errores_generales.append(str(exc))
        mensaje = 'La ejecución automática no pudo completarse.'

    fin = timezone.now()
    duracion_ms = max(0, int((fin - ejecucion.inicio).total_seconds() * 1000))
    EjecucionFuente.objects.filter(pk=ejecucion.pk).update(
        estado=estado,
        fin=fin,
        codigo_http=ultimo_codigo_http,
        documentos_encontrados=encontrados,
        documentos_descargados=descargados,
        documentos_duplicados=duplicados,
        documentos_omitidos=omitidos,
        total_errores=errores,
        paginas_revisadas=paginas,
        duracion_ms=duracion_ms,
        mensaje=mensaje,
        detalle_error='\n'.join(errores_generales)[:10000],
    )
    FuenteWeb.objects.filter(pk=fuente.pk).update(
        ultimo_estado_prueba=(
            FuenteWeb.EstadoPrueba.ERROR
            if estado == EjecucionFuente.Estado.ERROR
            else FuenteWeb.EstadoPrueba.DISPONIBLE
        ),
        ultima_prueba_en=fin,
        ultimo_codigo_http=ultimo_codigo_http,
        ultimo_mensaje_prueba=mensaje,
        ultimo_error_prueba='\n'.join(errores_generales)[:10000],
    )
    ejecucion.refresh_from_db()
    return ejecucion
