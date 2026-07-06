"""Motor de modificaciones operando sobre modelos de base de datos."""

import logging

from django.db import transaction
from django.utils import timezone

from leyes.models import LeyOriginal, LeyResultado, ModificacionDocumento

from .extractor import contiene_abrogacion
from .motor import aplicar_modificacion
from .vinculador import (
    sincronizar_estados_vinculacion,
    vincular_modificaciones_pendientes,
)

logger = logging.getLogger(__name__)



def _siguiente_version(ley: LeyOriginal) -> int:
    ultima = ley.resultados.order_by("-version").first()
    return (ultima.version + 1) if ultima else 1


def _ley_bloqueada(ley: LeyOriginal) -> bool:
    return ley.estado in (
        LeyOriginal.Estado.INACTIVO,
        LeyOriginal.Estado.ABROGADA,
    )


@transaction.atomic
def procesar_modificacion_db(mod: ModificacionDocumento) -> LeyResultado | None:
    if not mod.ley_original_id:
        return None

    ley = mod.ley_original

    if _ley_bloqueada(ley):
        logger.warning(
            "Ley %s en estado %s — se omite modificación %s",
            ley.codigo_ley,
            ley.estado,
            mod.archivo_origen,
        )
        mod.procesado = True
        mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.PROCESADO
        mod.save(update_fields=["procesado", "estado_vinculacion"])
        return None

    res = aplicar_modificacion(
        ley.contenido_completo,
        mod.contenido,
        ley_codigo=ley.codigo_ley,
        ley_titulo=ley.titulo,
        archivo_mod=mod.archivo_origen,
    )

    if (
        not res.claves_aplicadas
        and not res.abrogada
        and res.texto == ley.contenido_completo
    ):
        logger.warning("%s: sin efecto detectable", mod.archivo_origen)
        return None

    contenido_final = res.texto

    version = _siguiente_version(ley)
    lr = LeyResultado.objects.create(
        ley_original=ley,
        contenido_final=contenido_final,
        version=version,
        fecha_modificacion=timezone.now(),
        activo=True,
        preinforme=res.preinforme.to_dict(),
    )

    mod.procesado = True
    mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.PROCESADO
    mod.save(update_fields=["procesado", "estado_vinculacion"])

    update_ley = ["estado_proceso"]
    ley.estado_proceso = LeyOriginal.EstadoProceso.MODIFICADA

    if res.abrogada or res.detenido_por_abrogacion or contiene_abrogacion(mod.contenido):
        ley.estado = LeyOriginal.Estado.ABROGADA
        update_ley.append("estado")
    elif res.derogacion_total and not res.texto.strip():
        ley.estado = LeyOriginal.Estado.INACTIVO
        update_ley.append("estado")
    elif res.texto == "" and "SE ELIMINA" in str(res.claves_aplicadas):
        ley.estado = LeyOriginal.Estado.INACTIVO
        update_ley.append("estado")

    ley.save(update_fields=update_ley)
    return lr


def procesar_todas_pendientes() -> dict:
    """
    Procesa modificatorios vinculados y no procesados.
    Retorna resumen con contadores y detalle.
    """
    vinculadas = vincular_modificaciones_pendientes()
    sincronizar_estados_vinculacion()
    generados: list[LeyResultado] = []
    omitidos = 0
    errores: list[str] = []

    mods = ModificacionDocumento.objects.filter(
        procesado=False,
        ley_original__isnull=False,
    ).select_related("ley_original")

    for mod in mods:
        if mod.ley_original and _ley_bloqueada(mod.ley_original):
            mod.procesado = True
            mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.PROCESADO
            mod.save(update_fields=["procesado", "estado_vinculacion"])
            omitidos += 1
            continue
        try:
            lr = procesar_modificacion_db(mod)
            if lr:
                generados.append(lr)
            else:
                omitidos += 1
                errores.append(
                    f"{mod.archivo_origen}: sin cambios aplicables o ley bloqueada."
                )
        except Exception as e:
            logger.exception("Error procesando %s", mod.archivo_origen)
            errores.append(f"{mod.archivo_origen}: {e}")

    sin_vincular = ModificacionDocumento.objects.filter(
        procesado=False, ley_original__isnull=True
    ).count()
    listos = ModificacionDocumento.objects.filter(
        procesado=False,
        ley_original__isnull=False,
        estado_vinculacion=ModificacionDocumento.EstadoVinculacion.VINCULADA,
    ).count()

    return {
        "generados": generados,
        "vinculadas_auto": vinculadas,
        "procesados": len(generados),
        "omitidos": omitidos,
        "sin_vincular": sin_vincular,
        "listos_para_motor": listos,
        "errores": errores,
    }
