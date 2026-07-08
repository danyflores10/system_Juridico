"""Generación del pre-informe de auditoría legal."""

from dataclasses import asdict, dataclass, field

TIPOS_MODIFICADOS = {"SE MODIFICA", "SE SUSTITUYE", "SE COMPLEMENTA"}
TIPOS_INCORPORADOS = {"SE INCORPORA", "SE ADICIONA", "SE INCLUYE"}
TIPOS_DEROGADOS = {"SE ELIMINA", "DEROGACIÓN", "ABROGACIÓN", "SE DEROGA", "SE ABROGA", "SE SUPRIME"}


@dataclass
class EntradaPreinforme:
    tipo_accion: str
    descripcion: str
    extracto_quitado: str = ""
    extracto_agregado: str = ""
    articulo_referencia: str = ""
    norma_fuente: str = ""
    marcador: str = ""

    def to_dict(self):
        d = asdict(self)
        if not d["marcador"]:
            d["marcador"] = _marcador_tipo(self.tipo_accion)
        return d


def _marcador_tipo(tipo: str) -> str:
    t = (tipo or "").upper()
    if any(x in t for x in ("MODIFICA", "SUSTITUYE", "COMPLEMENTA")):
        return "⚠️"
    if any(x in t for x in ("INCORPORA", "ADICIONA", "INCLUYE")):
        return "➕"
    if any(x in t for x in ("ELIMINA", "DEROG", "ABROG", "SUPRIME")):
        return "❌"
    return "📌"


def _contar_palabras(texto: str) -> int:
    return len([w for w in texto.split() if w.strip()])


@dataclass
class PreInformeAuditoria:
    ley_codigo: str = ""
    ley_titulo: str = ""
    archivo_modificatorio: str = ""
    norma_modificatoria: dict = field(default_factory=dict)
    entradas: list[EntradaPreinforme] = field(default_factory=list)
    errores_detectados: list[dict] = field(default_factory=list)
    advertencias: list[dict] = field(default_factory=list)

    def agregar(
        self,
        tipo_accion: str,
        descripcion: str,
        quitado: str = "",
        agregado: str = "",
        articulo: str = "",
        norma_fuente: str = "",
    ):
        self.entradas.append(
            EntradaPreinforme(
                tipo_accion=tipo_accion,
                descripcion=descripcion,
                extracto_quitado=quitado,
                extracto_agregado=agregado,
                articulo_referencia=articulo,
                norma_fuente=norma_fuente,
                marcador=_marcador_tipo(tipo_accion),
            )
        )

    def _resumen_ejecutivo(self) -> dict:
        mods = incs = der = 0
        palabras = 0
        for e in self.entradas:
            t = e.tipo_accion.upper()
            if any(x in t for x in TIPOS_MODIFICADOS):
                mods += 1
            elif any(x in t for x in TIPOS_INCORPORADOS):
                incs += 1
            elif any(x in t for x in TIPOS_DEROGADOS):
                der += 1
            palabras += _contar_palabras(e.extracto_quitado)
            palabras += _contar_palabras(e.extracto_agregado)
        return {
            "articulos_modificados": mods,
            "articulos_incorporados": incs,
            "articulos_derogados": der,
            "palabras_cambiadas_aprox": palabras,
        }

    def to_dict(self):
        resumen = self._resumen_ejecutivo()
        return {
            "ley_codigo": self.ley_codigo,
            "ley_titulo": self.ley_titulo,
            "archivo_modificatorio": self.archivo_modificatorio,
            "norma_modificatoria": self.norma_modificatoria,
            "resumen_ejecutivo": resumen,
            "entradas": [e.to_dict() for e in self.entradas],
            "total_cambios": len(self.entradas),
            "errores_detectados": self.errores_detectados,
            "advertencias": self.advertencias,
        }
