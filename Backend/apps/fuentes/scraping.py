import json
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urldefrag, urljoin, urlsplit

import httpx
from django.conf import settings
from django.core.exceptions import ValidationError

from .validators import validar_url_fuente


USER_AGENT = 'Sistema-Consultor-Juridico/1.0 (+descarga-normativa)'
MAX_REDIRECCIONES = 5


class ErrorDescubrimiento(Exception):
    pass


@dataclass(frozen=True)
class EnlaceDocumento:
    url: str
    titulo: str = ''


@dataclass(frozen=True)
class DescargaRemota:
    contenido: bytes
    url_final: str
    codigo_http: int
    mime_type: str
    nombre_archivo: str


@dataclass(frozen=True)
class PaginaRenderizada:
    text: str
    url: str
    status_code: int
    headers: dict


class _LinkParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self._href = None
        self._text = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag.lower() == 'a' and values.get('href'):
            self._href = values['href']
            self._text = []
        elif tag.lower() in {'enclosure', 'link'}:
            url = values.get('url') or values.get('href')
            if url:
                self.links.append((url, values.get('title', ''), values.get('type', '')))

    def handle_data(self, data):
        if self._href:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == 'a' and self._href:
            self.links.append((self._href, ' '.join(self._text), ''))
            self._href = None
            self._text = []


def _response_with_safe_redirects(client, url, *, stream=False):
    current_url = url
    for _ in range(MAX_REDIRECCIONES + 1):
        validar_url_fuente(current_url)
        request = client.build_request('GET', current_url)
        response = client.send(request, stream=stream)
        if not response.is_redirect:
            return response
        location = response.headers.get('location')
        response.close()
        if not location:
            raise ErrorDescubrimiento('La redirección no incluye una URL de destino.')
        current_url = urljoin(current_url, location)
    raise ErrorDescubrimiento('La URL excedió el máximo de redirecciones permitidas.')


def obtener_listado(url):
    max_bytes = getattr(settings, 'SOURCE_MAX_LISTING_BYTES', 5 * 1024 * 1024)
    with httpx.Client(timeout=20.0, follow_redirects=False, headers={'User-Agent': USER_AGENT}) as client:
        response = _response_with_safe_redirects(client, url)
        response.raise_for_status()
        if len(response.content) > max_bytes:
            raise ErrorDescubrimiento('La página de listado supera el tamaño permitido.')
        return response


def obtener_listado_playwright(url, configuracion=None):
    """Renderiza una fuente JavaScript bloqueando destinos no públicos."""
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright

    config = configuracion or {}
    timeout_ms = max(1000, min(int(config.get('timeout_ms', 30000)), 60000))
    validar_url_fuente(url)

    def controlar_solicitud(route):
        try:
            validar_url_fuente(route.request.url)
        except ValidationError:
            route.abort('blockedbyclient')
            return
        route.continue_()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=USER_AGENT,
                accept_downloads=False,
            )
            context.route('**/*', controlar_solicitud)
            page = context.new_page()
            response = page.goto(
                url,
                wait_until='domcontentloaded',
                timeout=timeout_ms,
            )
            selector = str(config.get('esperar_selector', '')).strip()
            if selector:
                page.wait_for_selector(selector, timeout=timeout_ms)
            wait_ms = max(0, min(int(config.get('esperar_ms', 0)), 10000))
            if wait_ms:
                page.wait_for_timeout(wait_ms)
            html = page.content()
            final_url = page.url
            status_code = response.status if response else 200
            browser.close()
    except PlaywrightTimeoutError as exc:
        raise ErrorDescubrimiento(
            'La página JavaScript agotó el tiempo de espera.'
        ) from exc
    except ValidationError:
        raise
    except Exception as exc:
        raise ErrorDescubrimiento(
            f'Playwright no pudo renderizar la fuente: {exc}'
        ) from exc

    max_bytes = getattr(settings, 'SOURCE_MAX_LISTING_BYTES', 5 * 1024 * 1024)
    if len(html.encode('utf-8')) > max_bytes:
        raise ErrorDescubrimiento('La página renderizada supera el tamaño permitido.')
    return PaginaRenderizada(
        text=html,
        url=final_url,
        status_code=status_code,
        headers={'content-type': 'text/html; charset=utf-8'},
    )


def _iterar_urls_json(value, titulo=''):
    if isinstance(value, dict):
        local_title = str(value.get('titulo') or value.get('title') or value.get('nombre') or titulo)
        for key, child in value.items():
            if key.lower() in {'url', 'pdf', 'archivo', 'download', 'enlace'} and isinstance(child, str):
                yield child, local_title, ''
            else:
                yield from _iterar_urls_json(child, local_title)
    elif isinstance(value, list):
        for child in value:
            yield from _iterar_urls_json(child, titulo)


def descubrir_enlaces(response, url_base, configuracion=None):
    config = configuracion or {}
    content_type = response.headers.get('content-type', '').lower()
    raw_links = []
    if 'json' in content_type:
        try:
            raw_links = list(_iterar_urls_json(response.json()))
        except (json.JSONDecodeError, ValueError) as exc:
            raise ErrorDescubrimiento('La fuente declaró JSON pero respondió contenido inválido.') from exc
    else:
        parser = _LinkParser()
        parser.feed(response.text)
        raw_links = parser.links

    include = config.get('patron_incluir', '')
    exclude = config.get('patron_excluir', '')
    try:
        include_re = re.compile(include, re.IGNORECASE) if include else None
        exclude_re = re.compile(exclude, re.IGNORECASE) if exclude else None
    except re.error as exc:
        raise ErrorDescubrimiento(f'La expresión regular configurada no es válida: {exc}.') from exc

    discovered = []
    seen = set()
    for href, title, declared_type in raw_links:
        absolute = urldefrag(urljoin(url_base, href.strip()))[0]
        parsed = urlsplit(absolute)
        if parsed.scheme not in {'http', 'https'} or not parsed.hostname:
            continue
        searchable = f'{absolute} {title}'
        looks_pdf = parsed.path.lower().endswith('.pdf') or 'application/pdf' in declared_type.lower()
        if include_re:
            looks_pdf = bool(include_re.search(searchable))
        if not looks_pdf or (exclude_re and exclude_re.search(searchable)):
            continue
        if absolute in seen:
            continue
        seen.add(absolute)
        discovered.append(EnlaceDocumento(absolute, ' '.join(title.split())[:500]))
    return discovered


def descargar_pdf(url):
    max_bytes = getattr(settings, 'MAX_PDF_UPLOAD_SIZE', 100 * 1024 * 1024)
    timeout = httpx.Timeout(60.0, connect=15.0)
    with httpx.Client(timeout=timeout, follow_redirects=False, headers={'User-Agent': USER_AGENT}) as client:
        response = _response_with_safe_redirects(client, url, stream=True)
        try:
            response.raise_for_status()
            declared = response.headers.get('content-length')
            if declared and int(declared) > max_bytes:
                raise ErrorDescubrimiento('El PDF supera el tamaño máximo permitido.')
            chunks = []
            size = 0
            for chunk in response.iter_bytes(64 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise ErrorDescubrimiento('El PDF supera el tamaño máximo permitido.')
                chunks.append(chunk)
            content = b''.join(chunks)
            if not content.startswith(b'%PDF-'):
                raise ErrorDescubrimiento('El enlace no devolvió un archivo PDF válido.')
            mime_type = response.headers.get('content-type', '').split(';', 1)[0].strip().lower()
            filename = _nombre_archivo(response.headers.get('content-disposition', ''), str(response.url))
            return DescargaRemota(content, str(response.url), response.status_code, mime_type, filename)
        finally:
            response.close()


def _nombre_archivo(content_disposition, url):
    match = re.search(r"filename\*?=(?:UTF-8''|\")?([^\";]+)", content_disposition, re.IGNORECASE)
    candidate = unquote(match.group(1).strip()) if match else unquote(Path(urlsplit(url).path).name)
    candidate = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', candidate).strip(' .')
    if not candidate.lower().endswith('.pdf'):
        candidate = f'{candidate or "documento"}.pdf'
    return candidate[:255]
