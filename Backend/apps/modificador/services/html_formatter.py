"""Conversión y estandarización de contenido legislativo a HTML estructurado."""

import html
import re

PATRON_TITULO_LEY = re.compile(
    r"^((?:LEY|DECRETO|C[ÓO]DIGO|REGLAMENTO)[^\n]{8,200})$",
    re.IGNORECASE | re.MULTILINE,
)
PATRON_CAPITULO = re.compile(
    r"^(CAP[ÍI]TULO\s+[IVXLCDM\d]+[^\n]{0,80})$",
    re.IGNORECASE | re.MULTILINE,
)
PATRON_ARTICULO = re.compile(
    r"^(ART[ÍI]CULO\s+[\d]+[\w\-]*[^\n]{0,120})$",
    re.IGNORECASE | re.MULTILINE,
)
PATRON_SECCION = re.compile(
    r"^(SECCI[ÓO]N\s+[IVXLCDM\d]+[^\n]{0,80})$",
    re.IGNORECASE | re.MULTILINE,
)
PATRON_INCISO = re.compile(r"^([a-z]\))\s+", re.IGNORECASE)
PATRON_NUMERAL = re.compile(r"^(\d+[\.\)]|\d+\))\s+", re.IGNORECASE)


def escapar(texto: str) -> str:
    return html.escape(texto, quote=False)


def es_html(contenido: str) -> bool:
    c = contenido.strip()[:2000]
    return bool(re.search(r"</?(p|h[1-6]|ul|ol|li|strong|div)\b", c, re.I))


def html_a_texto_plano(contenido: str) -> str:
    """Extrae texto legible para regex de vinculación y palabras clave."""
    if not contenido:
        return ""
    t = contenido
    t = re.sub(r"<br\s*/?>", "\n", t, flags=re.I)
    t = re.sub(r"</p>\s*", "\n\n", t, flags=re.I)
    t = re.sub(r"</h[1-6]>\s*", "\n\n", t, flags=re.I)
    t = re.sub(r"</li>\s*", "\n", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def linea_a_html(linea: str) -> str:
    """Convierte una línea de texto plano a etiqueta HTML apropiada."""
    ln = linea.strip()
    if not ln:
        return ""
    if PATRON_TITULO_LEY.match(ln):
        return f'<h1 class="ley-titulo">{escapar(ln)}</h1>'
    if PATRON_CAPITULO.match(ln):
        return f'<h2 class="ley-capitulo">{escapar(ln)}</h2>'
    if PATRON_ARTICULO.match(ln):
        return f'<h3 class="ley-articulo">{escapar(ln)}</h3>'
    if PATRON_SECCION.match(ln):
        return f'<h4 class="ley-seccion">{escapar(ln)}</h4>'
    if PATRON_INCISO.match(ln):
        contenido = ln[3:].strip()
        return (
            f'<ul class="ley-lista-incisos"><li class="ley-inciso">'
            f"<strong>{escapar(ln[:3])}</strong> "
            f'<blockquote class="ley-cita">{escapar(contenido)}</blockquote>'
            f"</li></ul>"
        )
    if PATRON_NUMERAL.match(ln):
        return (
            f'<ul class="ley-lista-numeros"><li class="ley-numeral">'
            f'<blockquote class="ley-cita">{escapar(ln)}</blockquote>'
            f"</li></ul>"
        )
    if ln.isupper() and len(ln) > 12:
        return f'<h4 class="ley-subtitulo">{escapar(ln)}</h4>'
    return (
        f'<blockquote class="ley-cita ley-parrafo">'
        f"{escapar(ln)}</blockquote>"
    )


def estructurar_texto_legal(texto: str) -> str:
    """Aplica patrones legislativos a HTML con espaciado formal."""
    if es_html(texto):
        return normalizar_html_existente(texto)
    lineas = texto.replace("\r\n", "\n").split("\n")
    partes: list[str] = []
    for linea in lineas:
        bloque = linea_a_html(linea)
        if bloque:
            partes.append(bloque)
    cuerpo = "\n".join(partes) if partes else '<p class="ley-parrafo"></p>'
    return envolver_documento(cuerpo)


def normalizar_html_existente(contenido: str) -> str:
    c = contenido.strip()
    if "documento-ley" in c:
        return c
    return envolver_documento(c)


def envolver_documento(cuerpo: str) -> str:
    return (
        '<div class="documento-ley">\n'
        f"{cuerpo}\n"
        "</div>"
    )


def fragmento_a_html(texto: str) -> str:
    """Convierte fragmento de modificación a bloques HTML."""
    if es_html(texto):
        return normalizar_html_existente(texto)
    lineas = [ln.strip() for ln in texto.split("\n") if ln.strip()]
    if not lineas:
        return '<p class="ley-modificacion"></p>'
    return "\n".join(linea_a_html(ln) for ln in lineas)


def asegurar_html(contenido: str) -> str:
    if not contenido or not contenido.strip():
        return envolver_documento('<p class="ley-parrafo"></p>')
    if es_html(contenido):
        return normalizar_html_existente(contenido)
    return estructurar_texto_legal(contenido)


def marcar_cambio_articulo(
    tipo: str,
    norma: str,
    texto_anterior: str = "",
    texto_vigente: str = "",
    articulo: str = "",
) -> str:
    """Genera bloque HTML de trazabilidad normativa en el resultante."""
    icono = {"MODIFICA": "⚠️", "SUSTITUYE": "⚠️", "INCORPORA": "➕", "ELIMINA": "❌", "ABROGA": "❌"}.get(
        tipo.upper().split()[-1] if tipo else "", "📌"
    )
    partes = [
        f'<aside class="ley-marca-cambio ley-marca-{tipo.lower().replace(" ", "-")[:12]}">',
        f'<p class="ley-marca-etiqueta">{icono} [{tipo.upper()} por {escapar(norma)}]</p>',
    ]
    if articulo:
        partes.append(f'<p class="ley-marca-articulo"><strong>{escapar(articulo)}</strong></p>')
    if texto_anterior:
        partes.append(
            f'<blockquote class="ley-cita ley-texto-anterior">'
            f"<em>Texto anterior:</em> {escapar(texto_anterior)}</blockquote>"
        )
    if texto_vigente:
        partes.append(
            f'<blockquote class="ley-cita ley-texto-vigente">'
            f"<em>Texto vigente:</em> {escapar(texto_vigente)}</blockquote>"
        )
    partes.append("</aside>")
    return "\n".join(partes)


def truncar_extracto(texto: str, max_len: int = 220) -> str:
    t = html_a_texto_plano(texto) if es_html(texto) else texto
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 3].rstrip() + "…"
