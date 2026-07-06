"""Taxonomía de errores y advertencias del procesamiento legislativo."""

import re
from dataclasses import asdict, dataclass, field

PATRON_ARTICULO = re.compile(r"art[íi]culo\s+([\d]+[\w\-]*)", re.IGNORECASE)


@dataclass
class AlertaAuditoria:
    nivel: str  # critico, advertencia, nota, info
    codigo: str
    mensaje: str
    articulo: str = ""
    norma: str = ""

    def to_dict(self) -> dict:
        d = asdict(self)
        d["icono"] = {
            "critico": "🔴",
            "advertencia": "🟡",
            "nota": "🔵",
            "info": "⚪",
        }.get(self.nivel, "⚪")
        d["etiqueta"] = {
            "critico": "ERROR CRÍTICO",
            "advertencia": "ADVERTENCIA",
            "nota": "NOTA",
            "info": "INFO",
        }.get(self.nivel, "INFO")
        return d


@dataclass
class ResultadoAuditoria:
    alertas: list[AlertaAuditoria] = field(default_factory=list)

    def agregar(self, nivel: str, codigo: str, mensaje: str, **kwargs):
        self.alertas.append(AlertaAuditoria(nivel, codigo, mensaje, **kwargs))

    def to_list(self) -> list[dict]:
        return [a.to_dict() for a in self.alertas]

    @property
    def tiene_criticos(self) -> bool:
        return any(a.nivel == "critico" for a in self.alertas)


def _articulos_en_texto(texto: str) -> set[str]:
    return {m.group(1) for m in PATRON_ARTICULO.finditer(texto or "")}


def auditar_modificacion(
    texto_ley: str,
    texto_mod: str,
    entradas_preinforme: list[dict],
    norma_mod: str = "",
) -> ResultadoAuditoria:
    resultado = ResultadoAuditoria()
    arts_ley = _articulos_en_texto(texto_ley)
    arts_mod = _articulos_en_texto(texto_mod)

    for art in arts_mod:
        if art not in arts_ley:
            es_incorpora = any(
                "INCORPORA" in (e.get("tipo_accion") or "").upper()
                for e in entradas_preinforme
            )
            if not es_incorpora:
                resultado.agregar(
                    "critico",
                    "ART_INEXISTENTE",
                    f"Referencia al Artículo {art} que no existe en el original.",
                    articulo=f"Art. {art}",
                    norma=norma_mod,
                )

    refs = [e.get("articulo_referencia", "") for e in entradas_preinforme if e.get("articulo_referencia")]
    vistos: dict[str, int] = {}
    for ref in refs:
        vistos[ref] = vistos.get(ref, 0) + 1
    for ref, n in vistos.items():
        if n > 1:
            resultado.agregar(
                "advertencia",
                "DOBLE_MODIFICACION",
                f"El {ref} fue modificado {n} veces en el mismo documento.",
                articulo=ref,
                norma=norma_mod,
            )

    nums = sorted(int(re.search(r"\d+", a).group()) for a in arts_ley if re.search(r"\d+", a))
    if len(nums) >= 3:
        for i in range(len(nums) - 1):
            if nums[i + 1] - nums[i] > 1:
                resultado.agregar(
                    "nota",
                    "NUM_NO_CORRELATIVA",
                    f"Numeración no correlativa detectada: salto entre Art. {nums[i]} y Art. {nums[i + 1]}.",
                    norma=norma_mod,
                )
                break

    if not entradas_preinforme and texto_mod.strip():
        resultado.agregar(
            "info",
            "SIN_CAMBIOS",
            "El modificatorio no produjo entradas en el pre-informe; revisar palabras clave normativas.",
            norma=norma_mod,
        )

    if arts_ley:
        resultado.agregar(
            "info",
            "VERSION_DISPONIBLE",
            f"Texto original disponible con {len(arts_ley)} artículo(s) identificado(s) para comparación.",
            norma=norma_mod,
        )

    return resultado
