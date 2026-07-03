from datetime import timedelta

from celery import shared_task
from celery.utils.log import get_task_logger
from django.db import transaction
from django.utils import timezone

from .models import EjecucionFuente, FuenteWeb
from .services import crear_ejecucion_descarga, ejecutar_descarga_fuente


logger = get_task_logger(__name__)


@shared_task(bind=True, name='fuentes.ejecutar_descarga')
def ejecutar_descarga_task(self, ejecucion_id):
    EjecucionFuente.objects.filter(pk=ejecucion_id).update(
        tarea_id=self.request.id or '',
    )
    ejecucion = ejecutar_descarga_fuente(ejecucion_id)
    return {
        'ejecucion_id': ejecucion.pk,
        'fuente_id': ejecucion.fuente_id,
        'estado': ejecucion.estado,
        'encontrados': ejecucion.documentos_encontrados,
        'descargados': ejecucion.documentos_descargados,
        'duplicados': ejecucion.documentos_duplicados,
        'errores': ejecucion.total_errores,
    }


def encolar_descarga_fuente(
    fuente,
    *,
    seccion=None,
    usuario=None,
    tipo=EjecucionFuente.TipoEjecucion.EJECUCION_MANUAL,
):
    with transaction.atomic():
        reciente = EjecucionFuente.objects.select_for_update().filter(
            fuente=fuente,
            seccion=seccion,
            estado=EjecucionFuente.Estado.EN_PROCESO,
            inicio__gte=timezone.now() - timedelta(hours=2),
        ).first()
        if reciente:
            return reciente
        ejecucion = crear_ejecucion_descarga(
            fuente,
            seccion=seccion,
            usuario=usuario,
            tipo=tipo,
        )
    try:
        tarea = ejecutar_descarga_task.delay(ejecucion.pk)
    except Exception as exc:
        EjecucionFuente.objects.filter(pk=ejecucion.pk).update(
            estado=EjecucionFuente.Estado.ERROR,
            fin=timezone.now(),
            mensaje='No se pudo enviar la ejecución a Celery.',
            detalle_error=str(exc),
            total_errores=1,
        )
        raise
    EjecucionFuente.objects.filter(pk=ejecucion.pk).update(tarea_id=tarea.id or '')
    ejecucion.refresh_from_db()
    return ejecucion


def _esta_vencida(fuente, now):
    if fuente.frecuencia_consulta == FuenteWeb.FrecuenciaConsulta.MANUAL:
        return False
    ultima = EjecucionFuente.objects.filter(
        fuente=fuente,
        tipo_ejecucion=EjecucionFuente.TipoEjecucion.EJECUCION_PROGRAMADA,
    ).exclude(estado=EjecucionFuente.Estado.EN_PROCESO).order_by('-inicio').first()
    if not ultima:
        return True
    intervalo = (
        timedelta(days=1)
        if fuente.frecuencia_consulta == FuenteWeb.FrecuenciaConsulta.DIARIA
        else timedelta(days=7)
    )
    return ultima.inicio <= now - intervalo


@shared_task(name='fuentes.programar_descargas_pendientes')
def programar_descargas_pendientes_task():
    now = timezone.now()
    encoladas = []
    for fuente in FuenteWeb.objects.filter(activa=True).exclude(
        frecuencia_consulta=FuenteWeb.FrecuenciaConsulta.MANUAL,
    ):
        if not _esta_vencida(fuente, now):
            continue
        try:
            ejecucion = encolar_descarga_fuente(
                fuente,
                tipo=EjecucionFuente.TipoEjecucion.EJECUCION_PROGRAMADA,
            )
            encoladas.append(ejecucion.pk)
        except Exception:
            logger.exception('No se pudo programar la fuente %s.', fuente.codigo)
    return {'ejecuciones_encoladas': encoladas, 'total': len(encoladas)}
