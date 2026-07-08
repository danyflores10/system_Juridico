"""Operaciones HTML del motor de modificaciones legislativas.

Cumple la regla del módulo: el texto modificado o derogado queda VISIBLE
pero TACHADO (<del>), acompañado de una nota que identifica la norma
modificatoria, para comparar cómo era la norma antes y cómo queda ahora.
"""
import re

from bs4 import BeautifulSoup

from .html_formatter import (
    asegurar_html,
    envolver_documento,
    fragmento_a_html,
    html_a_texto_plano,
)


def _soup(contenido: str) -> BeautifulSoup:
    return BeautifulSoup(asegurar_html(contenido), 'html.parser')


def _obtener_div(soup: BeautifulSoup):
    div = soup.find('div', class_='documento-ley')
    if not div:
        div = soup.new_tag('div', attrs={'class': 'documento-ley'})
        if soup.body:
            soup.body.append(div)
        else:
            soup.append(div)
    return div


def _serializar(soup: BeautifulSoup) -> str:
    div = _obtener_div(soup)
    return envolver_documento(div.decode_contents())


def _nodos_fragmento(html_fragmento: str) -> list:
    frag = BeautifulSoup(fragmento_a_html(html_fragmento), 'html.parser')
    inner = frag.find('div', class_='documento-ley')
    nodos = list(inner.children) if inner else list(frag.children)
    return [n for n in nodos if getattr(n, 'name', None)]


def _append_fragmento(div, html_fragmento: str):
    for nodo in _nodos_fragmento(html_fragmento):
        div.append(nodo)


def _insertar_despues(tag, nodos: list):
    """Inserta nodos en orden inmediatamente después de `tag`."""
    ancla = tag
    for nodo in nodos:
        ancla.insert_after(nodo)
        ancla = nodo
    return ancla


def _bloque_nota(soup: BeautifulSoup, nota: str, tipo: str = 'modifica'):
    aside = soup.new_tag(
        'aside',
        attrs={'class': f'ley-marca-cambio ley-marca-{tipo}'},
    )
    p = soup.new_tag('p', attrs={'class': 'ley-marca-etiqueta'})
    p.string = nota
    aside.append(p)
    return aside


def _tachar_tag(soup: BeautifulSoup, tag):
    """Envuelve el contenido del tag en <del> preservando la estructura."""
    if tag.find('del', recursive=False):
        return
    contenido = tag.decode_contents()
    tag.clear()
    del_tag = soup.new_tag('del', attrs={'class': 'ley-texto-anterior'})
    frag = BeautifulSoup(contenido, 'html.parser')
    for nodo in list(frag.children):
        del_tag.append(nodo)
    tag.append(del_tag)
    clases = tag.get('class') or []
    if 'ley-bloque-tachado' not in clases:
        tag['class'] = [*clases, 'ley-bloque-tachado']


def _nodos_vigentes(html_fragmento: str) -> list:
    nodos = _nodos_fragmento(html_fragmento)
    for nodo in nodos:
        clases = nodo.get('class') or []
        nodo['class'] = [*clases, 'ley-texto-vigente']
    return nodos


def _patron_articulo(num: str) -> re.Pattern:
    return re.compile(rf'art[íi]culo\s+{re.escape(num)}(?!\d)', re.I)


PATRON_INICIO_ARTICULO = re.compile(r'^\s*art[íi]culo\s+\d', re.I)


def _bloques_articulo(div, num: str) -> list:
    """Localiza el encabezado del artículo `num` y sus párrafos hasta el
    siguiente artículo o encabezado estructural."""
    patron = _patron_articulo(num)
    bloques: list = []
    en_articulo = False
    for tag in list(div.children):
        if not getattr(tag, 'name', None):
            continue
        texto = tag.get_text()
        if not en_articulo:
            if patron.search(texto):
                en_articulo = True
                bloques.append(tag)
            continue
        if tag.name in ('h1', 'h2', 'h3', 'h4') or PATRON_INICIO_ARTICULO.match(texto):
            break
        if tag.name in ('p', 'blockquote', 'ul', 'ol', 'li'):
            bloques.append(tag)
    return bloques


def html_reemplazar(
    contenido_html: str,
    viejo: str,
    nuevo: str,
    nota: str = '',
    articulo: str = '',
) -> str:
    """Sustituye texto: el anterior queda tachado y el vigente a continuación.

    Orden de estrategias: coincidencia literal del texto anterior →
    artículo referenciado (tacha el bloque completo) → anexado al final.
    """
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    plano = html_a_texto_plano(contenido_html)
    viejo_n = re.sub(r'\s+', ' ', viejo.strip())

    if viejo_n and viejo_n in re.sub(r'\s+', ' ', plano):
        for tag in div.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'li', 'blockquote']):
            tag_plano = re.sub(r'\s+', ' ', tag.get_text())
            if viejo_n in tag_plano or tag_plano in viejo_n:
                _tachar_tag(soup, tag)
                nodos = []
                if nota:
                    nodos.append(_bloque_nota(soup, nota, 'modifica'))
                nodos.extend(_nodos_vigentes(nuevo))
                _insertar_despues(tag, nodos)
                return _serializar(soup)

    if articulo:
        bloques = _bloques_articulo(div, articulo)
        if bloques:
            for tag in bloques:
                _tachar_tag(soup, tag)
            nodos = []
            if nota:
                nodos.append(_bloque_nota(soup, nota, 'modifica'))
            nodos.extend(_nodos_vigentes(nuevo))
            _insertar_despues(bloques[-1], nodos)
            return _serializar(soup)

    if nota:
        div.append(_bloque_nota(soup, nota, 'modifica'))
    for nodo in _nodos_vigentes(nuevo):
        div.append(nodo)
    return _serializar(soup)


def html_eliminar(contenido_html: str, fragmento: str, nota: str = '') -> str:
    """Deroga/elimina: el texto afectado queda visible pero tachado."""
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    frag_n = re.sub(r'\s+', ' ', fragmento.strip())
    if not frag_n:
        return _serializar(soup)

    m_art = re.search(r'art[íi]culo\s+([\d]+)', frag_n, re.I)
    if m_art:
        bloques = _bloques_articulo(div, m_art.group(1))
        if bloques:
            for tag in bloques:
                _tachar_tag(soup, tag)
            if nota:
                _insertar_despues(bloques[0], [_bloque_nota(soup, nota, 'deroga')])
            return _serializar(soup)

    for tag in list(div.find_all(['p', 'li', 'h3', 'h4', 'blockquote'])):
        if frag_n in re.sub(r'\s+', ' ', tag.get_text()):
            _tachar_tag(soup, tag)
            if nota:
                _insertar_despues(tag, [_bloque_nota(soup, nota, 'deroga')])
            break
    return _serializar(soup)


def html_incorporar(contenido_html: str, ancla: str, nuevo: str, nota: str = '') -> str:
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    ancla_l = ancla.strip().lower()

    if ancla_l:
        for tag in div.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'blockquote']):
            if ancla_l in tag.get_text().lower():
                nodos = []
                if nota:
                    nodos.append(_bloque_nota(soup, nota, 'incorpora'))
                nodos.extend(_nodos_vigentes(nuevo))
                _insertar_despues(tag, nodos)
                return _serializar(soup)

    if nota:
        div.append(_bloque_nota(soup, nota, 'incorpora'))
    for nodo in _nodos_vigentes(nuevo):
        div.append(nodo)
    return _serializar(soup)


def html_complementar(contenido_html: str, complemento: str, nota: str = '') -> str:
    soup = _soup(contenido_html)
    div = _obtener_div(soup)
    if nota:
        div.append(_bloque_nota(soup, nota, 'complementa'))
    for nodo in _nodos_vigentes(complemento):
        div.append(nodo)
    return _serializar(soup)


def html_abrogar(contenido_html: str, mensaje: str, nota: str = '') -> str:
    """Abrogación/derogación total: todo el texto queda visible pero tachado."""
    soup = _soup(contenido_html)
    div = _obtener_div(soup)

    for tag in list(div.children):
        if getattr(tag, 'name', None):
            _tachar_tag(soup, tag)

    encabezado = soup.new_tag('aside', attrs={'class': 'ley-marca-cambio ley-marca-abroga'})
    p1 = soup.new_tag('p', attrs={'class': 'ley-marca-etiqueta'})
    p1.string = mensaje
    encabezado.append(p1)
    if nota:
        p2 = soup.new_tag('p', attrs={'class': 'ley-marca-detalle'})
        p2.string = nota
        encabezado.append(p2)
    div.insert(0, encabezado)
    return _serializar(soup)


def html_vacio(mensaje: str) -> str:
    return envolver_documento(f'<p class="ley-aviso"><em>{mensaje}</em></p>')
