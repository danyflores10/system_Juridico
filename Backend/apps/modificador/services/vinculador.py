"""Motor de vinculación automática y manual modificatorio ↔ ley original."""

import logging
import re

from django.db import transaction

from apps.modificador.models import LeyOriginal, ModificacionDocumento

from .extractor import (
    CodigoCandidato,
    extraer_codigo_ley,
    extraer_codigos_candidatos,
    normalizar_codigo,
)
from .metadatos_legislativos import parsear_nombre_archivo

logger = logging.getLogger(__name__)


def buscar_ley_activa(codigo: str) -> LeyOriginal | None:
    if not codigo:
        return None
    cod_norm = normalizar_codigo(codigo)
    for ley in LeyOriginal.objects.filter(estado=LeyOriginal.Estado.ACTIVO):
        if normalizar_codigo(ley.codigo_ley) == cod_norm:
            return ley
    return LeyOriginal.objects.filter(
        codigo_ley__iexact=codigo, estado=LeyOriginal.Estado.ACTIVO
    ).first()


def buscar_leyes_mencionadas_en_texto(
    contenido: str, nombre_archivo: str = ""
) -> LeyOriginal | None:
    """
    Escaneo inverso (reintento): busca qué leyes ACTIVAS del sistema
    aparecen citadas dentro del texto del modificatorio.
    """
    texto = f"{nombre_archivo}\n{contenido}"
    leyes = LeyOriginal.objects.filter(estado=LeyOriginal.Estado.ACTIVO).order_by(
        "-codigo_ley"
    )
    for ley in leyes:
        cod = ley.codigo_ley
        cod_n = normalizar_codigo(cod)
        patrones = [
            rf"\bley\s*(?:n[°ºo\.\s]*)?{re.escape(cod)}\b",
            rf"\bley\s*(?:n[°ºo\.\s]*)?{re.escape(cod_n)}\b",
            rf"(?:^|[\s_;,(])L\s*{re.escape(cod_n)}\b",
            rf"(?:^|[\s_;,(])L\s*{re.escape(cod)}\b",
            rf"\b(?:de|a|la)\s+ley\s+{re.escape(cod_n)}\b",
            rf"\breforma\s+(?:a\s+)?(?:la\s+)?ley\s+{re.escape(cod_n)}\b",
        ]
        for patron in patrones:
            if re.search(patron, texto, re.IGNORECASE):
                logger.info(
                    "Ley %s encontrada en texto del modificatorio (%s)",
                    cod,
                    patron[:40],
                )
                return ley
    return None


def _actualizar_estado_ley_vinculada(ley: LeyOriginal):
    if ley.estado_proceso == LeyOriginal.EstadoProceso.PENDIENTE:
        ley.estado_proceso = LeyOriginal.EstadoProceso.VINCULADA
        ley.save(update_fields=["estado_proceso"])


@transaction.atomic
def vincular_modificacion(
    mod: ModificacionDocumento,
    ley: LeyOriginal | None = None,
    ley_id: int | None = None,
) -> tuple[bool, str]:
    if mod.procesado:
        return False, "El documento ya fue procesado."

    if ley_id:
        ley = LeyOriginal.objects.filter(
            pk=ley_id, estado=LeyOriginal.Estado.ACTIVO
        ).first()
        if not ley:
            return False, "La ley seleccionada no existe o no está activa."

    if not ley:
        return False, "No se especificó ley para vincular."

    mod.ley_original = ley
    mod.codigo_ley_detectado = ley.codigo_ley
    mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.VINCULADA
    mod.save(
        update_fields=["ley_original", "codigo_ley_detectado", "estado_vinculacion"]
    )
    _actualizar_estado_ley_vinculada(ley)
    logger.info("Vinculado %s → Ley %s", mod.archivo_origen, ley.codigo_ley)
    return True, f"Vinculado a Ley {ley.codigo_ley} — Lista para procesar."


@transaction.atomic
def vincular_automatica(mod: ModificacionDocumento) -> tuple[bool, str]:
    """Vinculación al cargar: mención en texto → descripción del archivo → código."""
    if mod.procesado:
        return False, "Ya procesado."

    ley_en_texto = buscar_leyes_mencionadas_en_texto(mod.contenido, mod.archivo_origen)
    if ley_en_texto:
        mod.codigo_ley_detectado = ley_en_texto.codigo_ley
        mod.save(update_fields=["codigo_ley_detectado"])
        return vincular_modificacion(mod, ley=ley_en_texto)

    meta = parsear_nombre_archivo(mod.archivo_origen)
    if meta and meta.descripcion:
        for cand in extraer_codigos_candidatos(meta.descripcion, meta.descripcion):
            ley = buscar_ley_activa(cand.codigo)
            if ley:
                mod.codigo_ley_detectado = ley.codigo_ley
                mod.save(update_fields=["codigo_ley_detectado"])
                return vincular_modificacion(mod, ley=ley)

    codigo = extraer_codigo_ley(mod.archivo_origen, mod.contenido[:12000])
    if codigo:
        mod.codigo_ley_detectado = codigo
        mod.save(update_fields=["codigo_ley_detectado"])
        ley = buscar_ley_activa(codigo)
        if ley:
            return vincular_modificacion(mod, ley=ley)

    mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.PENDIENTE
    mod.save(update_fields=["estado_vinculacion"])
    return False, (
        f"Código «{codigo or '?'}» detectado en el archivo, "
        "pero no coincide con ninguna ley activa cargada en Etapa I."
    )


@transaction.atomic
def reintentar_escaneo_vinculacion(mod: ModificacionDocumento) -> tuple[bool, str, dict]:
    """
    Reintento profundo (distinto a vinculación manual):
    1) Busca leyes del sistema mencionadas dentro del PDF/texto.
    2) Re-analiza candidatos con regex ampliado.
    3) Devuelve diagnóstico si no hay match.
    """
    if mod.procesado:
        return False, "El documento ya fue procesado.", {}

    info: dict = {"metodo": "escaneo_profundo", "candidatos": [], "leyes_sistema": []}

    leyes_activas = list(
        LeyOriginal.objects.filter(estado=LeyOriginal.Estado.ACTIVO).order_by(
            "codigo_ley"
        )
    )
    info["leyes_sistema"] = [
        {"id": l.id, "codigo": l.codigo_ley, "titulo": l.titulo[:80]}
        for l in leyes_activas
    ]

    if not leyes_activas:
        return (
            False,
            "No hay leyes originales activas. Cargue primero las leyes en la Etapa I.",
            info,
        )

    ley_en_texto = buscar_leyes_mencionadas_en_texto(
        mod.contenido, mod.archivo_origen
    )
    if ley_en_texto:
        ok, msg = vincular_modificacion(mod, ley=ley_en_texto)
        info["metodo"] = "mencion_en_texto"
        info["ley_encontrada"] = ley_en_texto.codigo_ley
        return ok, f"Reintento exitoso: el documento cita la Ley {ley_en_texto.codigo_ley} en su texto.", info

    candidatos = extraer_codigos_candidatos(mod.archivo_origen, mod.contenido)
    info["candidatos"] = [
        {"codigo": c.codigo, "fuente": c.fuente, "prioridad": c.prioridad}
        for c in candidatos[:8]
    ]

    for cand in candidatos:
        cod = normalizar_codigo(cand.codigo)
        mod.codigo_ley_detectado = cod
        ley = buscar_ley_activa(cod)
        if ley:
            ok, msg = vincular_modificacion(mod, ley=ley)
            info["metodo"] = "codigo_en_archivo"
            return (
                ok,
                f"Reintento exitoso: código {cod} vinculado a Ley {ley.codigo_ley}.",
                info,
            )

    mejor = candidatos[0].codigo if candidatos else mod.codigo_ley_detectado or "?"
    mod.codigo_ley_detectado = mejor if candidatos else mod.codigo_ley_detectado
    mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.PENDIENTE
    mod.save(update_fields=["codigo_ley_detectado", "estado_vinculacion"])

    leyes_str = ", ".join(f"Ley {l.codigo_ley}" for l in leyes_activas[:8])
    cods_str = ", ".join(c["codigo"] for c in info["candidatos"][:5]) or "ninguno"

    return (
        False,
        f"Escaneo profundo sin coincidencia. En el archivo se detectó: [{cods_str}]. "
        f"Leyes disponibles en el sistema: [{leyes_str}]. "
        "Use el botón «Asignar ▾» para elegir la ley correcta manualmente.",
        info,
    )


@transaction.atomic
def vincular_modificaciones_pendientes() -> int:
    vinculadas = 0
    mods = ModificacionDocumento.objects.filter(
        ley_original__isnull=True, procesado=False
    )
    for mod in mods:
        ok, _ = vincular_automatica(mod)
        if not ok:
            ok, _, _ = reintentar_escaneo_vinculacion(mod)
        if ok:
            vinculadas += 1
    return vinculadas


def sincronizar_estados_vinculacion():
    """Corrige modificatorios con FK pero estado pendiente."""
    for mod in ModificacionDocumento.objects.filter(
        ley_original__isnull=False, procesado=False
    ):
        if mod.estado_vinculacion != ModificacionDocumento.EstadoVinculacion.VINCULADA:
            mod.estado_vinculacion = ModificacionDocumento.EstadoVinculacion.VINCULADA
            mod.save(update_fields=["estado_vinculacion"])
