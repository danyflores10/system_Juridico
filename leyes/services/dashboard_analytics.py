"""Agregación de datos para el dashboard legislativo (formato prompt maestro)."""

import re
from collections import Counter
from datetime import datetime

from leyes.models import LeyOriginal, LeyResultado, ModificacionDocumento

from .metadatos_legislativos import parsear_nombre_archivo
from .html_formatter import html_a_texto_plano

ACCIONES_LEGISLATIVAS = [
    "SE MODIFICA", "SE SUSTITUYE", "SE INCORPORA", "SE COMPLEMENTA",
    "SE ELIMINA", "ABROGACIÓN", "DEROGACIÓN", "SE ADICIONA",
    "SE DEROGA", "SE ABROGA", "SE INCLUYE", "SE SUPRIME",
]

STOPWORDS = {
    "de", "la", "el", "en", "y", "a", "los", "las", "del", "que",
    "se", "un", "una", "por", "con", "al", "su", "para", "es",
    "no", "lo", "le", "o", "e", "si", "son", "como", "pero",
    "más", "todo", "todos", "todas", "este", "esta", "estos",
    "estas", "ley", "artículo", "articulo", "número", "numero",
    "dicho", "dicha", "dichos", "dichas", "ello", "ella",
}


def contar_palabras_clave_obligatorias(texto: str) -> dict[str, int]:
    """Conteo exacto de palabras clave normativas exigidas en el dashboard."""
    t = (texto or "").lower()
    return {
        "modifica": len(re.findall(r"\bmodifica\b", t)),
        "sustituye": len(re.findall(r"\bsustituye\b", t)),
        "deroga": len(re.findall(r"\bderoga\b", t)),
        "derogación": len(re.findall(r"\bderogaci[oó]n\b", t)),
        "abroga": len(re.findall(r"\babroga\b", t)),
        "abrogación": len(re.findall(r"\babrogaci[oó]n\b", t)),
    }


def contar_acciones(texto: str) -> dict[str, int]:
    texto_up = (texto or "").upper()
    return {a: texto_up.count(a) for a in ACCIONES_LEGISLATIVAS if texto_up.count(a) > 0}


def palabras_frecuentes(texto: str, top: int = 25) -> list[dict]:
    words = re.findall(r"\b[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{4,}\b", texto or "")
    words_lower = [w.lower() for w in words if w.lower() not in STOPWORDS]
    return [{"palabra": p, "count": n} for p, n in Counter(words_lower).most_common(top)]


def stats_panel() -> dict:
    mods_qs = ModificacionDocumento.objects.all()
    return {
        "leyes": LeyOriginal.objects.filter(estado=LeyOriginal.Estado.ACTIVO).count(),
        "mods_pendientes": mods_qs.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PENDIENTE,
            procesado=False,
        ).count(),
        "mods_vinculadas": mods_qs.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.VINCULADA,
            procesado=False,
        ).count(),
        "mods_procesadas": mods_qs.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PROCESADO
        ).count(),
        "resultados": LeyResultado.objects.filter(activo=True).count(),
        "leyes_inactivas": LeyOriginal.objects.exclude(
            estado=LeyOriginal.Estado.ACTIVO
        ).count(),
    }


def _accion_principal(conteo: dict) -> str:
    if not conteo:
        return "modifica"
    top = max(conteo, key=conteo.get)
    m = {
        "SE SUSTITUYE": "sustituye",
        "SE INCORPORA": "incorpora",
        "SE ELIMINA": "elimina",
        "ABROGACIÓN": "abroga",
        "DEROGACIÓN": "deroga",
    }
    return m.get(top, "modifica")


def _versiones_ley(ley: LeyOriginal) -> list[dict]:
    versiones = []
    for res in ley.resultados.filter(activo=True).order_by("version"):
        pi = res.preinforme or {}
        re_sum = pi.get("resumen_ejecutivo") or {}
        norma = pi.get("norma_modificatoria") or {}
        versiones.append({
            "norma": norma.get("norma") or pi.get("archivo_modificatorio", ""),
            "fecha": norma.get("fecha_iso") or "",
            "articulos_modificados": re_sum.get("articulos_modificados", 0),
            "articulos_incorporados": re_sum.get("articulos_incorporados", 0),
            "articulos_derogados": re_sum.get("articulos_derogados", 0),
            "palabras_cambiadas": re_sum.get("palabras_cambiadas_aprox", 0),
            "accion_principal": _accion_principal(
                contar_acciones(res.notas or "")
            ),
            "version": res.version,
        })
    return versiones


def _alertas_globales() -> list[dict]:
    alertas = []
    for res in LeyResultado.objects.filter(activo=True).select_related("ley_original"):
        pi = res.preinforme or {}
        for err in pi.get("errores_detectados", []):
            alertas.append({**err, "ley": res.ley_original.codigo_ley, "version": res.version})
        for adv in pi.get("advertencias", []):
            alertas.append({**adv, "ley": res.ley_original.codigo_ley, "version": res.version})
    for mod in ModificacionDocumento.objects.filter(ley_original__isnull=True, procesado=False):
        meta = parsear_nombre_archivo(mod.archivo_origen)
        alertas.append({
            "nivel": "advertencia",
            "icono": "🟡",
            "etiqueta": "ADVERTENCIA",
            "codigo": "SIN_VINCULAR",
            "mensaje": f"Modificatorio sin vincular: {mod.archivo_origen[:80]}",
            "norma": meta.norma if meta else mod.archivo_origen,
            "ley": mod.codigo_ley_detectado or "—",
        })
    return alertas[:30]


def _cronologia_modificatorias() -> list[dict]:
    items = []
    for mod in ModificacionDocumento.objects.select_related("ley_original").all():
        meta = parsear_nombre_archivo(mod.archivo_origen)
        fecha = meta.fecha_iso if meta else ""
        items.append({
            "archivo": mod.archivo_origen,
            "tipo": meta.tipo if meta else "?",
            "norma": meta.norma if meta else mod.archivo_origen,
            "fecha": fecha,
            "descripcion": meta.descripcion if meta else "",
            "ley_objetivo": mod.ley_original.codigo_ley if mod.ley_original else mod.codigo_ley_detectado,
            "estado": mod.get_estado_vinculacion_display(),
            "procesado": mod.procesado,
        })
    items.sort(key=lambda x: x["fecha"] or "9999")
    return items


def construir_metadatos_ley(ley: LeyOriginal) -> dict:
    resultados = ley.resultados.filter(activo=True)
    errores = []
    for res in resultados:
        pi = res.preinforme or {}
        errores.extend(pi.get("errores_detectados", []))
    return {
        "ley_original": f"Ley {ley.codigo_ley}",
        "fecha_original": _fecha_desde_archivo(ley.archivo_origen),
        "titulo": ley.titulo,
        "total_articulos": _contar_articulos(ley.contenido_completo),
        "versiones": _versiones_ley(ley),
        "palabras_frecuentes_modificadas": _palabras_modificacion_ley(ley),
        "errores_detectados": errores,
    }


def _fecha_desde_archivo(nombre: str) -> str:
    meta = parsear_nombre_archivo(nombre)
    return meta.fecha_iso if meta else ""


def _contar_articulos(texto: str) -> int:
    return len(re.findall(r"art[íi]culo\s+[\d]+", texto or "", re.I))


def _palabras_modificacion_ley(ley: LeyOriginal) -> list[str]:
    c: Counter = Counter()
    for mod in ley.modificaciones.all():
        c.update(contar_acciones(mod.contenido).keys())
    return [k for k, _ in c.most_common(8)]


def construir_dashboard_context() -> dict:
    mods = list(ModificacionDocumento.objects.all())
    resultados = list(LeyResultado.objects.filter(activo=True).select_related("ley_original"))

    acciones_global: Counter = Counter()
    for mod in mods:
        acciones_global.update(contar_acciones(mod.contenido))

    todo_mods = " ".join(m.contenido for m in mods)
    todo_res = " ".join(r.contenido_final for r in resultados)
    corpus_plano = html_a_texto_plano(todo_mods + " " + todo_res)
    palabras_clave = contar_palabras_clave_obligatorias(corpus_plano)

    leyes_stats = []
    metadatos_por_ley = []
    for ley in LeyOriginal.objects.filter(estado=LeyOriginal.Estado.ACTIVO):
        meta = construir_metadatos_ley(ley)
        metadatos_por_ley.append(meta)
        leyes_stats.append({
            "codigo": ley.codigo_ley,
            "titulo": ley.titulo[:70],
            "n_mods": ley.modificaciones.count(),
            "n_resultados": ley.resultados.filter(activo=True).count(),
            "estado": ley.get_estado_proceso_display(),
            "fecha_original": meta["fecha_original"],
            "total_articulos": meta["total_articulos"],
        })

    stats = stats_panel()
    alertas = _alertas_globales()
    cronologia = _cronologia_modificatorias()

    return {
        "stats": stats,
        "acciones": [{"accion": k, "count": v} for k, v in acciones_global.most_common()],
        "palabras_mods": palabras_frecuentes(todo_mods, 25),
        "palabras_res": palabras_frecuentes(todo_res, 25),
        "palabras_clave_obligatorias": palabras_clave,
        "top_palabras_general": palabras_frecuentes(corpus_plano, 15),
        "leyes_stats": leyes_stats,
        "metadatos_por_ley": metadatos_por_ley,
        "alertas": alertas,
        "cronologia": cronologia,
        "total_modificatorios": len(mods),
        "total_resultados": len(resultados),
        "generado_en": datetime.now().isoformat(timespec="seconds"),
    }


def construir_api_dashboard() -> dict:
    ctx = construir_dashboard_context()
    return {
        "ok": True,
        "stats": ctx["stats"],
        "acciones": ctx["acciones"],
        "palabras": ctx["palabras_mods"][:20],
        "palabras_res": ctx["palabras_res"][:20],
        "palabras_clave_obligatorias": ctx["palabras_clave_obligatorias"],
        "top_palabras_general": ctx["top_palabras_general"],
        "leyes_stats": ctx["leyes_stats"],
        "metadatos_por_ley": ctx["metadatos_por_ley"],
        "alertas": ctx["alertas"],
        "cronologia": ctx["cronologia"],
        "total_modificatorios": ctx["total_modificatorios"],
        "total_resultados": ctx["total_resultados"],
        "generado_en": ctx["generado_en"],
    }
