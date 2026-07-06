"""Extracción de metadatos legislativos — regex avanzado para vinculación."""

import re
from dataclasses import dataclass

# Patrones ordenados por prioridad (mayor = más confiable)
PATRONES_LEY = [
    (
        100,
        re.compile(
            r"(?:ley|l\.)\s*(?:n[°ºo\.\s]*)?(\d{3,8})",
            re.IGNORECASE,
        ),
        "ley_explicita",
    ),
    (
        95,
        re.compile(
            r"(?:decreto|d\.)\s*(?:n[°ºo\.\s]*)?(\d{3,8})",
            re.IGNORECASE,
        ),
        "decreto",
    ),
    (
        90,
        re.compile(
            r"(?:reforma|modifica(?:ción|cion)?|abroga(?:ción|cion)?|deroga(?:ción|cion)?)"
            r"(?:\s+\w+){0,6}\s+(?:a\s+)?(?:la\s+)?ley\s*(?:n[°ºo\.\s]*)?(\d{3,8})",
            re.IGNORECASE,
        ),
        "reforma_ley",
    ),
    (
        88,
        re.compile(
            r"(?:^|[\s_;,\(])L\s*(\d{2,8})\b",
            re.IGNORECASE,
        ),
        "ley_abreviada",
    ),
    (
        85,
        re.compile(
            r"ley\s*(?:n[°ºo\.\s]*)?(\d{3,8})",
            re.IGNORECASE,
        ),
        "ley_simple",
    ),
    (
        80,
        re.compile(
            r"(?:n[°ºo]|numero|número|no\.?)\s*(\d{3,8})",
            re.IGNORECASE,
        ),
        "numero",
    ),
    (
        70,
        re.compile(
            r"(?:^|[\s_\-])(\d{4,8})(?:[\s_\-]|\.pdf|\.docx|$)",
            re.IGNORECASE,
        ),
        "archivo_o_aislado",
    ),
    (
        50,
        re.compile(
            r"\b(\d{3,8})\b",
        ),
        "numero_contexto",
    ),
]

PATRON_TITULO = re.compile(
    r"^((?:LEY|DECRETO|C[ÓO]DIGO|REGLAMENTO)[^\n]{5,120})",
    re.IGNORECASE | re.MULTILINE,
)

PALABRAS_CLAVE = (
    "ABROGACIÓN",
    "DEROGACIÓN",
    "SE INCORPORA",
    "SE MODIFICA",
    "SE SUSTITUYE",
    "SE ELIMINA",
    "SE COMPLEMENTA",
)

PATRON_ABROGACION = re.compile(r"\bABROGACI[ÓO]N\b", re.IGNORECASE)


@dataclass
class CodigoCandidato:
    codigo: str
    prioridad: int
    fuente: str


def normalizar_codigo(codigo: str) -> str:
    """Unifica formato numérico (elimina ceros a la izquierda)."""
    c = codigo.strip()
    if c.isdigit():
        return str(int(c))
    return c


def extraer_codigos_candidatos(
    nombre_archivo: str, contenido: str
) -> list[CodigoCandidato]:
    """Extrae todos los códigos posibles con puntuación de confianza."""
    from .html_formatter import html_a_texto_plano

    if "<" in contenido:
        contenido = html_a_texto_plano(contenido)
    vistos: set[str] = set()
    candidatos: list[CodigoCandidato] = []

    limite = len(contenido) if len(contenido) < 50000 else 50000
    bloques = [
        (nombre_archivo.replace("_", " ").replace("-", " "), 15, "archivo"),
        (contenido[:limite], 10, "contenido"),
        ("\n".join(contenido.splitlines()[:30]), 5, "encabezado"),
    ]

    for texto, bonus, zona in bloques:
        if not texto:
            continue
        for prioridad, patron, etiqueta in PATRONES_LEY:
            if zona == "encabezado" and etiqueta == "numero_contexto":
                continue
            if zona == "archivo" and etiqueta == "numero_contexto":
                prioridad += 5
            for m in patron.finditer(texto):
                cod = normalizar_codigo(m.group(1))
                if not cod or cod in vistos:
                    continue
                if etiqueta != "ley_abreviada" and len(cod) < 3:
                    continue
                if etiqueta == "ley_abreviada" and len(cod) < 2:
                    continue
                if _es_falso_positivo(cod, texto, m.start()):
                    continue
                vistos.add(cod)
                candidatos.append(
                    CodigoCandidato(
                        codigo=cod,
                        prioridad=prioridad + bonus,
                        fuente=f"{etiqueta}:{zona}",
                    )
                )

    candidatos.sort(key=lambda c: -c.prioridad)
    return candidatos


def _es_falso_positivo(codigo: str, texto: str, pos: int) -> bool:
    """Filtra años, fechas en nombre de archivo y páginas."""
    ventana = texto[max(0, pos - 35) : pos + len(codigo) + 35]
    ventana_lower = ventana.lower()

    if re.search(r"\d{1,2}[-/]\d{1,2}[-/]" + re.escape(codigo), ventana):
        return True
    if re.search(re.escape(codigo) + r"[-/]\d", ventana):
        return True
    if re.search(r"[-/]" + re.escape(codigo) + r"[-/]", ventana):
        return True

    if len(codigo) == 4 and codigo.startswith(("19", "20")):
        if any(
            x in ventana_lower
            for x in ("año", "ano", "fecha", "pagina", "página", "folio", ";")
        ):
            return True

    if ";" in ventana and len(codigo) == 4:
        for p in ventana.split(";"):
            if codigo in p and re.search(r"\d{1,2}-\d{1,2}-\d{4}", p):
                return True

    return False


def extraer_codigo_ley(nombre_archivo: str, contenido: str) -> str | None:
    """Devuelve el código con mayor prioridad."""
    candidatos = extraer_codigos_candidatos(nombre_archivo, contenido)
    return candidatos[0].codigo if candidatos else None


def extraer_titulo(contenido: str, nombre_archivo: str = "") -> str:
    from .html_formatter import html_a_texto_plano

    if "<" in contenido:
        contenido = html_a_texto_plano(contenido)
    for linea in contenido.splitlines()[:15]:
        linea = linea.strip()
        if len(linea) < 10:
            continue
        m = PATRON_TITULO.match(linea)
        if m:
            return m.group(1).strip()[:500]
        if linea.isupper() and len(linea) > 15:
            return linea[:500]
    stem = nombre_archivo.rsplit(".", 1)[0].replace("_", " ").replace("-", " ")
    return stem.title()[:500] if stem else "Ley sin título detectado"


def detectar_palabras_clave(contenido: str) -> list[str]:
    encontradas = []
    texto_upper = contenido.upper()
    if PATRON_ABROGACION.search(contenido):
        encontradas.append("ABROGACIÓN")
    for kw in PALABRAS_CLAVE:
        if kw == "ABROGACIÓN":
            continue
        if kw.upper() in texto_upper or kw.replace("Ó", "O").upper() in texto_upper:
            if kw not in encontradas:
                encontradas.append(kw)
    return encontradas


def contiene_abrogacion(contenido: str) -> bool:
    return bool(PATRON_ABROGACION.search(contenido))
