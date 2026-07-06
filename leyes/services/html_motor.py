"""Operaciones HTML para el motor de modificaciones legislativas."""

import re

from bs4 import BeautifulSoup

from .html_formatter import asegurar_html, envolver_documento, fragmento_a_html, html_a_texto_plano


def _soup(contenido: str) -> BeautifulSoup:
    return BeautifulSoup(asegurar_html(contenido), "html.parser")


def _obtener_div(soup: BeautifulSoup):
    div = soup.find("div", class_="documento-ley")
    if not div:
        div = soup.new_tag("div", attrs={"class": "documento-ley"})
        if soup.body:
            soup.body.append(div)
        else:
            soup.append(div)
    return div


def _serializar(soup: BeautifulSoup) -> str:
    div = _obtener_div(soup)
    return envolver_documento(div.decode_contents())


def _append_fragmento(div, html_fragmento: str):
    frag = BeautifulSoup(fragmento_a_html(html_fragmento), "html.parser")
    inner = frag.find("div", class_="documento-ley")
    nodos = list(inner.children) if inner else list(frag.children)
    for nodo in nodos:
        if getattr(nodo, "name", None):
            div.append(nodo)


def html_reemplazar(contenido_html: str, viejo: str, nuevo: str) -> str:
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    plano = html_a_texto_plano(contenido_html)
    viejo_n = re.sub(r"\s+", " ", viejo.strip())

    if viejo_n and viejo_n in re.sub(r"\s+", " ", plano):
        for tag in div.find_all(["p", "h1", "h2", "h3", "h4", "li"]):
            tag_plano = re.sub(r"\s+", " ", tag.get_text())
            if viejo_n in tag_plano or tag_plano in viejo_n:
                tag.clear()
                _append_fragmento(tag, nuevo)
                return _serializar(soup)

    _append_fragmento(div, nuevo)
    return _serializar(soup)


def html_eliminar(contenido_html: str, fragmento: str) -> str:
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    frag_n = re.sub(r"\s+", " ", fragmento.strip())
    if not frag_n:
        return _serializar(soup)

    m_art = re.search(r"art[íi]culo\s+([\d]+[\w\-]*)", frag_n, re.I)
    if m_art:
        num = m_art.group(1)
        patron = re.compile(rf"art[íi]culo\s+{re.escape(num)}", re.I)
        en_articulo = False
        for tag in list(div.children):
            if not getattr(tag, "name", None):
                continue
            txt = tag.get_text()
            if patron.search(txt):
                tag.decompose()
                en_articulo = True
                continue
            if en_articulo and tag.name in ("h1", "h2", "h3", "h4"):
                break
            if en_articulo and tag.name == "p":
                tag.decompose()
        return _serializar(soup)

    for tag in list(div.find_all(["p", "li", "h3", "h4"])):
        if frag_n in re.sub(r"\s+", " ", tag.get_text()):
            tag.decompose()
    return _serializar(soup)


def html_incorporar(contenido_html: str, ancla: str, nuevo: str) -> str:
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    ancla_l = ancla.strip().lower()

    if ancla_l:
        for tag in div.find_all(["h1", "h2", "h3", "h4", "p"]):
            if ancla_l in tag.get_text().lower():
                _append_fragmento_after(tag, nuevo)
                return _serializar(soup)

    _append_fragmento(div, nuevo)
    return _serializar(soup)


def _append_fragmento_after(tag, html_fragmento: str):
    frag = BeautifulSoup(fragmento_a_html(html_fragmento), "html.parser")
    inner = frag.find("div", class_="documento-ley")
    nodos = list(inner.children) if inner else list(frag.children)
    for nodo in reversed(nodos):
        if getattr(nodo, "name", None):
            tag.insert_after(nodo)


def html_complementar(contenido_html: str, complemento: str) -> str:
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    _append_fragmento(div, complemento)
    return _serializar(soup)


def html_vacio(mensaje: str) -> str:
    return envolver_documento(f'<p class="ley-aviso"><em>{mensaje}</em></p>')
