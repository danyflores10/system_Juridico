"""Motor lógico de modificaciones legislativas con HTML y pre-informe."""

import logging
import re
from dataclasses import dataclass, field

from .auditoria import auditar_modificacion
from .extractor import contiene_abrogacion
from .html_formatter import (
    asegurar_html,
    fragmento_a_html,
    html_a_texto_plano,
    truncar_extracto,
)
from .metadatos_legislativos import parsear_nombre_archivo
from .html_motor import (
    html_complementar,
    html_eliminar,
    html_incorporar,
    html_reemplazar,
    html_vacio,
)
from .preinforme import PreInformeAuditoria

logger = logging.getLogger(__name__)

PATRON_CLAVE = re.compile(
    r"(ABROGACI[ÓO]N|DEROGACI[ÓO]N|SE\s+INCORPORA|SE\s+MODIFICA|SE\s+SUSTITUYE|SE\s+ELIMINA|SE\s+COMPLEMENTA)",
    re.IGNORECASE,
)
SEPARADOR_POR = re.compile(r"\bPOR\s*:\s*", re.IGNORECASE)
PATRON_DEROGACION_TOTAL = re.compile(
    r"(?:en\s+su\s+)?totalidad|íntegramente|por\s+completo|totalmente|"
    r"en\s+forma\s+total|derógase\s+por\s+completo|queda\s+derogad[ao]\s+en\s+su\s+totalidad",
    re.IGNORECASE,
)
PATRON_ARTICULO = re.compile(r"art[íi]culo\s+([\d]+[\w\-]*)", re.IGNORECASE)
PATRON_ANCLA_INCORPORA = re.compile(
    r"(?:en\s+el|al|despu[ée]s\s+del|antes\s+del|siguiente\s+al)\s+"
    r"(art[íi]culo\s+[\d]+[\w\-]*)",
    re.IGNORECASE,
)

PRIORIDAD_APLICACION = {
    "ABROGACION": 0,
    "DEROGACION": 1,
    "SE INCORPORA": 2,
    "SE MODIFICA": 3,
    "SE SUSTITUYE": 3,
    "SE ELIMINA": 4,
    "SE COMPLEMENTA": 5,
}


@dataclass
class ResultadoMotor:
    texto: str
    abrogada: bool = False
    derogacion_total: bool = False
    claves_aplicadas: list[str] = field(default_factory=list)
    detenido_por_abrogacion: bool = False
    preinforme: PreInformeAuditoria = field(default_factory=PreInformeAuditoria)


def _normalizar_clave(clave: str) -> str:
    c = clave.upper().strip()
    return (
        c.replace("Ó", "O")
        .replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ú", "U")
    )


def _etiqueta_clave(clave: str) -> str:
    return {
        "ABROGACION": "ABROGACIÓN",
        "DEROGACION": "DEROGACIÓN",
        "SE INCORPORA": "SE INCORPORA",
    }.get(clave, clave)


def _dividir_bloques(texto_mod: str) -> list[tuple[str, str]]:
    plano = html_a_texto_plano(texto_mod) if "<" in texto_mod else texto_mod
    bloques: list[tuple[str, str]] = []
    matches = list(PATRON_CLAVE.finditer(plano))
    if not matches:
        return bloques
    for i, m in enumerate(matches):
        clave = _normalizar_clave(m.group(1))
        inicio = m.end()
        fin = matches[i + 1].start() if i + 1 < len(matches) else len(plano)
        cuerpo = plano[inicio:fin].strip()
        bloques.append((clave, cuerpo))
    bloques.sort(key=lambda b: PRIORIDAD_APLICACION.get(b[0], 99))
    return bloques


def _ref_articulo(cuerpo: str) -> str:
    m = PATRON_ARTICULO.search(cuerpo)
    return f"Art. {m.group(1)}" if m else ""


def _norma_fuente(archivo_mod: str) -> str:
    meta = parsear_nombre_archivo(archivo_mod)
    if meta:
        return f"{meta.norma} — {meta.fecha}"
    return archivo_mod


def _aplicar_bloque(
    html_ley: str,
    clave: str,
    cuerpo: str,
    informe: PreInformeAuditoria,
    norma: str = "",
) -> tuple[str, bool, bool]:
    ref = _ref_articulo(cuerpo)
    nf = norma or informe.norma_modificatoria.get("norma", "")

    if clave == "ABROGACION":
        informe.agregar(
            "ABROGACIÓN",
            "ABROGACIÓN TOTAL de la norma — la ley queda suspendida en su totalidad.",
            quitado=truncar_extracto(html_a_texto_plano(html_ley)),
            articulo=ref,
            norma_fuente=nf,
        )
        return html_vacio("Norma abrogada en su totalidad."), True, False

    if clave == "DEROGACION":
        if PATRON_DEROGACION_TOTAL.search(cuerpo):
            informe.agregar(
                "DEROGACIÓN",
                "DEROGACIÓN TOTAL — la norma queda sin efecto en el texto consolidado.",
                quitado=truncar_extracto(html_a_texto_plano(html_ley)),
                articulo=ref,
                norma_fuente=nf,
            )
            return html_vacio("Derogación total aplicada."), False, True

        fragmento = cuerpo.split("\n")[0].strip()
        m_art = PATRON_ARTICULO.search(cuerpo)
        viejo_txt = fragmento or (f"Artículo {m_art.group(1)}" if m_art else "")
        nuevo_html = html_eliminar(html_ley, viejo_txt)
        informe.agregar(
            "DEROGACIÓN",
            f"DEROGACIÓN PARCIAL{(' del ' + ref) if ref else ''} — se eliminó el fragmento indicado.",
            quitado=truncar_extracto(viejo_txt),
            articulo=ref,
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave == "SE INCORPORA":
        partes = SEPARADOR_POR.split(cuerpo, maxsplit=1)
        if len(partes) == 2:
            ancla, nuevo = partes[0].strip(), partes[1].strip()
        else:
            m_ancla = PATRON_ANCLA_INCORPORA.search(cuerpo)
            ancla = m_ancla.group(1) if m_ancla else ""
            nuevo = cuerpo[m_ancla.end() :].strip() if m_ancla else cuerpo.strip()
        nuevo_html = html_incorporar(html_ley, ancla, nuevo)
        desc = f"SE INCORPORA nuevo texto{(' en ' + ref) if ref else ''}."
        if ancla:
            desc = f"SE INCORPORA contenido posterior a «{ancla[:50]}»."
        informe.agregar(
            "SE INCORPORA",
            desc,
            agregado=truncar_extracto(nuevo),
            articulo=ref or _ref_articulo(ancla),
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave == "SE ELIMINA":
        fragmento = cuerpo.split("\n")[0].strip() if cuerpo else ""
        nuevo_html = html_eliminar(html_ley, fragmento)
        informe.agregar(
            "SE ELIMINA",
            f"SE ELIMINA fragmento{(' del ' + ref) if ref else ''}.",
            quitado=truncar_extracto(fragmento),
            articulo=ref,
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave in ("SE SUSTITUYE", "SE MODIFICA"):
        partes = SEPARADOR_POR.split(cuerpo, maxsplit=1)
        if len(partes) == 2:
            viejo, nuevo = partes[0].strip(), partes[1].strip()
            nuevo_html = html_reemplazar(html_ley, viejo, nuevo)
            informe.agregar(
                _etiqueta_clave(clave),
                f"{_etiqueta_clave(clave)} — sustitución de texto{(' en ' + ref) if ref else ''}.",
                quitado=truncar_extracto(viejo),
                agregado=truncar_extracto(nuevo),
                articulo=ref,
                norma_fuente=nf,
            )
            return nuevo_html, False, False
        nuevo = cuerpo.strip()
        if nuevo:
            nuevo_html = html_complementar(html_ley, nuevo)
            informe.agregar(
                _etiqueta_clave(clave),
                f"{_etiqueta_clave(clave)} — se añadió texto al final del documento.",
                agregado=truncar_extracto(nuevo),
                articulo=ref,
                norma_fuente=nf,
            )
            return nuevo_html, False, False
        return html_ley, False, False

    if clave == "SE COMPLEMENTA":
        complemento = cuerpo.strip()
        if complemento:
            nuevo_html = html_complementar(html_ley, complemento)
            informe.agregar(
                "SE COMPLEMENTA",
                "SE COMPLEMENTA — texto añadido al final de la ley.",
                agregado=truncar_extracto(complemento),
                articulo=ref,
                norma_fuente=nf,
            )
            return nuevo_html, False, False
        return html_ley, False, False

    return html_ley, False, False


def aplicar_modificacion(
    texto_ley: str,
    texto_mod: str,
    ley_codigo: str = "",
    ley_titulo: str = "",
    archivo_mod: str = "",
) -> ResultadoMotor:
    html_ley = asegurar_html(texto_ley)
    meta = parsear_nombre_archivo(archivo_mod)
    norma_dict = meta.to_dict() if meta else {}
    norma_txt = _norma_fuente(archivo_mod)
    informe = PreInformeAuditoria(
        ley_codigo=ley_codigo,
        ley_titulo=ley_titulo,
        archivo_modificatorio=archivo_mod,
        norma_modificatoria=norma_dict,
    )
    resultado = ResultadoMotor(texto=html_ley, preinforme=informe)

    plano_mod = html_a_texto_plano(texto_mod) if "<" in texto_mod else texto_mod

    if contiene_abrogacion(plano_mod):
        resultado.texto = html_vacio("Norma abrogada en su totalidad.")
        resultado.abrogada = True
        resultado.detenido_por_abrogacion = True
        resultado.claves_aplicadas.append("ABROGACIÓN")
        informe.agregar(
            "ABROGACIÓN",
            "ABROGACIÓN TOTAL detectada en el documento modificatorio.",
            quitado=truncar_extracto(html_a_texto_plano(html_ley)),
            norma_fuente=norma_txt,
        )
        audit = auditar_modificacion(texto_ley, texto_mod, informe.entradas, norma_txt)
        informe.errores_detectados = [a for a in audit.to_list() if a["nivel"] == "critico"]
        informe.advertencias = [a for a in audit.to_list() if a["nivel"] != "critico"]
        resultado.preinforme = informe
        return resultado

    bloques = _dividir_bloques(texto_mod)
    if not bloques:
        resultado.preinforme = informe
        return resultado

    texto = html_ley
    for clave, cuerpo in bloques:
        if clave == "ABROGACION":
            texto, abrog, derog = _aplicar_bloque(texto, clave, cuerpo, informe)
            resultado.abrogada = True
            resultado.detenido_por_abrogacion = True
            resultado.claves_aplicadas.append("ABROGACIÓN")
            break

        logger.info("  Aplicando %s...", clave)
        texto, abrog, derog_total = _aplicar_bloque(texto, clave, cuerpo, informe)
        resultado.claves_aplicadas.append(_etiqueta_clave(clave))

        if abrog:
            resultado.abrogada = True
            resultado.detenido_por_abrogacion = True
            break
        if derog_total:
            resultado.derogacion_total = True
            break

    resultado.texto = asegurar_html(texto)
    audit = auditar_modificacion(texto_ley, texto_mod, [e.to_dict() for e in informe.entradas], norma_txt)
    informe.errores_detectados = [a for a in audit.to_list() if a["nivel"] == "critico"]
    informe.advertencias = [a for a in audit.to_list() if a["nivel"] != "critico"]
    resultado.preinforme = informe
    return resultado
