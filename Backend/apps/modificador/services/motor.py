"""Motor lógico de modificaciones legislativas con HTML y pre-informe.

Cada cambio aplicado deja el texto anterior tachado y una nota con la
norma modificatoria (norma, título y fecha de promulgación).
"""
import logging
import re
from dataclasses import dataclass, field

from .auditoria import auditar_modificacion
from .extractor import contiene_abrogacion
from .html_formatter import asegurar_html, html_a_texto_plano, truncar_extracto
from .html_motor import (
    html_abrogar,
    html_complementar,
    html_eliminar,
    html_incorporar,
    html_reemplazar,
)
from .metadatos_legislativos import parsear_nombre_archivo
from .preinforme import PreInformeAuditoria

logger = logging.getLogger(__name__)

PATRON_CLAVE = re.compile(
    r'(ABROGACI[ÓO]N|DEROGACI[ÓO]N|SE\s+INCORPORA|SE\s+MODIFICA|SE\s+SUSTITUYE|SE\s+ELIMINA|SE\s+COMPLEMENTA)',
    re.IGNORECASE,
)
SEPARADOR_POR = re.compile(r'\bPOR\s*:\s*', re.IGNORECASE)
PATRON_DEROGACION_TOTAL = re.compile(
    r'(?:en\s+su\s+)?totalidad|íntegramente|por\s+completo|totalmente|'
    r'en\s+forma\s+total|derógase\s+por\s+completo|queda\s+derogad[ao]\s+en\s+su\s+totalidad',
    re.IGNORECASE,
)
PATRON_ARTICULO = re.compile(r'art[íi]culo\s+([\d]+[\w\-]*)', re.IGNORECASE)
PATRON_ANCLA_INCORPORA = re.compile(
    r'(?:en\s+el|al|despu[ée]s\s+del|antes\s+del|siguiente\s+al)\s+'
    r'(art[íi]culo\s+[\d]+[\w\-]*)',
    re.IGNORECASE,
)

PRIORIDAD_APLICACION = {
    'ABROGACION': 0,
    'DEROGACION': 1,
    'SE INCORPORA': 2,
    'SE MODIFICA': 3,
    'SE SUSTITUYE': 3,
    'SE ELIMINA': 4,
    'SE COMPLEMENTA': 5,
}

TIPOS_NORMA_LEGIBLES = {
    'L': 'Ley',
    'DL': 'Decreto Ley',
    'DS': 'Decreto Supremo',
    'RS': 'Resolución Suprema',
    'RM': 'Resolución Ministerial',
    'RA': 'Resolución Administrativa',
    'RND': 'Resolución Normativa de Directorio',
    'SC': 'Sentencia Constitucional',
    'DC': 'Declaración Constitucional',
    'AC': 'Auto Constitucional',
    'AS': 'Auto Supremo',
    'RARA': 'Resolución que Absuelve el Recurso de Alzada',
    'RARR': 'Resolución que Absuelve el Recurso de Revocatoria',
    'RARJ': 'Resolución que Absuelve el Recurso Jerárquico',
    'RRDL': 'Resolución de Restitución de Derechos Laborales',
}

ACCION_NOTA = {
    'SE MODIFICA': 'modificado',
    'SE SUSTITUYE': 'sustituido',
    'SE ELIMINA': 'eliminado',
    'DEROGACION': 'derogado',
    'ABROGACION': 'abrogado',
    'SE INCORPORA': 'incorporado',
    'SE COMPLEMENTA': 'complementado',
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
        c.replace('Ó', 'O')
        .replace('Á', 'A')
        .replace('É', 'E')
        .replace('Í', 'I')
        .replace('Ú', 'U')
    )


def _etiqueta_clave(clave: str) -> str:
    return {
        'ABROGACION': 'ABROGACIÓN',
        'DEROGACION': 'DEROGACIÓN',
        'SE INCORPORA': 'SE INCORPORA',
    }.get(clave, clave)


def _norma_legible(archivo_mod: str) -> str:
    """«DD; L 1448; 25-07-2022; …» → «Ley N° 1448 — Título (25-07-2022)»."""
    meta = parsear_nombre_archivo(archivo_mod)
    if not meta:
        return archivo_mod
    partes = meta.norma.split()
    tipo = TIPOS_NORMA_LEGIBLES.get(partes[0].upper(), partes[0]) if partes else meta.norma
    numero = partes[1] if len(partes) > 1 else meta.codigo_norma
    etiqueta = f'{tipo} N° {numero}' if numero else meta.norma
    if meta.descripcion:
        etiqueta += f' — {meta.descripcion}'
    if meta.fecha:
        etiqueta += f' ({meta.fecha})'
    return etiqueta


def _nota_cambio(clave: str, archivo_mod: str, articulo: str = '') -> str:
    accion = ACCION_NOTA.get(clave, 'modificado')
    sujeto = f'El {articulo}' if articulo else 'El presente texto'
    return f'{sujeto} fue {accion} por {_norma_legible(archivo_mod)}.'


PATRON_ENUMERACION_MOD = re.compile(
    r'(?:^|\n)\s*art[íi]culo\s+\d+[\.\)]?\s*$', re.IGNORECASE
)
PATRON_REF_LEY_INICIAL = re.compile(
    r'^\s*(?:el\s+|del\s+|de\s+la\s+|en\s+el\s+|al\s+)?'
    r'art[íi]culo\s+\d+[\w\-]*\s*'
    r'(?:de\s+la\s+ley\s*n?[°º\.\s]*\d+)?\s*[:,]?\s*',
    re.IGNORECASE,
)
PATRON_REF_LEY_SUELTA = re.compile(
    r'^\s*(?:de\s+la\s+)?ley\s*n?[°º\.\s]*\d+\s*[:,]?\s*', re.IGNORECASE
)


def _limpiar_cuerpo(cuerpo: str) -> str:
    """Quita la propia numeración del documento modificatorio que queda
    adherida al final de un bloque («… fundamentada. Artículo 2.»)."""
    cuerpo = cuerpo.strip()
    prev = None
    while prev != cuerpo:
        prev = cuerpo
        cuerpo = PATRON_ENUMERACION_MOD.sub('', cuerpo).strip()
    return cuerpo


def _limpiar_texto_nuevo(texto: str) -> str:
    """Elimina la referencia legislativa inicial dejando solo el texto vigente."""
    limpio = PATRON_REF_LEY_INICIAL.sub('', texto).strip()
    limpio = PATRON_REF_LEY_SUELTA.sub('', limpio).strip()
    return limpio or texto.strip()


def _dividir_bloques(texto_mod: str) -> list[tuple[str, str]]:
    plano = html_a_texto_plano(texto_mod) if '<' in texto_mod else texto_mod
    bloques: list[tuple[str, str]] = []
    matches = list(PATRON_CLAVE.finditer(plano))
    if not matches:
        return bloques
    for i, m in enumerate(matches):
        clave = _normalizar_clave(m.group(1))
        inicio = m.end()
        fin = matches[i + 1].start() if i + 1 < len(matches) else len(plano)
        cuerpo = _limpiar_cuerpo(plano[inicio:fin])
        bloques.append((clave, cuerpo))
    bloques.sort(key=lambda b: PRIORIDAD_APLICACION.get(b[0], 99))
    return bloques


def _ref_articulo(cuerpo: str) -> str:
    m = PATRON_ARTICULO.search(cuerpo)
    return f'Art. {m.group(1)}' if m else ''


def _norma_fuente(archivo_mod: str) -> str:
    meta = parsear_nombre_archivo(archivo_mod)
    if meta:
        return f'{meta.norma} — {meta.fecha}'
    return archivo_mod


def _aplicar_bloque(
    html_ley: str,
    clave: str,
    cuerpo: str,
    informe: PreInformeAuditoria,
    archivo_mod: str = '',
) -> tuple[str, bool, bool]:
    ref = _ref_articulo(cuerpo)
    nf = _norma_fuente(archivo_mod)
    nota = _nota_cambio(clave, archivo_mod, ref)

    if clave == 'ABROGACION':
        informe.agregar(
            'ABROGACIÓN',
            'ABROGACIÓN TOTAL de la norma — la ley queda suspendida en su totalidad.',
            quitado=truncar_extracto(html_a_texto_plano(html_ley)),
            articulo=ref,
            norma_fuente=nf,
        )
        nuevo = html_abrogar(
            html_ley,
            'NORMA ABROGADA EN SU TOTALIDAD',
            _nota_cambio('ABROGACION', archivo_mod),
        )
        return nuevo, True, False

    if clave == 'DEROGACION':
        if PATRON_DEROGACION_TOTAL.search(cuerpo):
            informe.agregar(
                'DEROGACIÓN',
                'DEROGACIÓN TOTAL — la norma queda sin efecto en el texto consolidado.',
                quitado=truncar_extracto(html_a_texto_plano(html_ley)),
                articulo=ref,
                norma_fuente=nf,
            )
            nuevo = html_abrogar(
                html_ley,
                'NORMA DEROGADA EN SU TOTALIDAD',
                _nota_cambio('DEROGACION', archivo_mod),
            )
            return nuevo, False, True

        fragmento = cuerpo.split('\n')[0].strip()
        m_art = PATRON_ARTICULO.search(cuerpo)
        viejo_txt = fragmento or (f'Artículo {m_art.group(1)}' if m_art else '')
        nuevo_html = html_eliminar(html_ley, viejo_txt, nota=nota)
        informe.agregar(
            'DEROGACIÓN',
            f"DEROGACIÓN PARCIAL{(' del ' + ref) if ref else ''} — el texto queda tachado en el consolidado.",
            quitado=truncar_extracto(viejo_txt),
            articulo=ref,
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave == 'SE INCORPORA':
        partes = SEPARADOR_POR.split(cuerpo, maxsplit=1)
        if len(partes) == 2:
            ancla, nuevo = partes[0].strip(), partes[1].strip()
        else:
            m_ancla = PATRON_ANCLA_INCORPORA.search(cuerpo)
            ancla = m_ancla.group(1) if m_ancla else ''
            nuevo = cuerpo[m_ancla.end():].strip() if m_ancla else cuerpo.strip()
        nuevo = _limpiar_texto_nuevo(nuevo)
        nuevo_html = html_incorporar(html_ley, ancla, nuevo, nota=nota)
        desc = f"SE INCORPORA nuevo texto{(' en ' + ref) if ref else ''}."
        if ancla:
            desc = f'SE INCORPORA contenido posterior a «{ancla[:50]}».'
        informe.agregar(
            'SE INCORPORA',
            desc,
            agregado=truncar_extracto(nuevo),
            articulo=ref or _ref_articulo(ancla),
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave == 'SE ELIMINA':
        fragmento = cuerpo.split('\n')[0].strip() if cuerpo else ''
        nuevo_html = html_eliminar(html_ley, fragmento, nota=nota)
        informe.agregar(
            'SE ELIMINA',
            f"SE ELIMINA fragmento{(' del ' + ref) if ref else ''} — queda tachado en el consolidado.",
            quitado=truncar_extracto(fragmento),
            articulo=ref,
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave in ('SE SUSTITUYE', 'SE MODIFICA'):
        m_num = PATRON_ARTICULO.search(cuerpo)
        num_articulo = m_num.group(1) if m_num else ''
        partes = SEPARADOR_POR.split(cuerpo, maxsplit=1)
        if len(partes) == 2:
            viejo, nuevo = partes[0].strip(), partes[1].strip()
        else:
            viejo, nuevo = '', cuerpo.strip()
        if not nuevo:
            return html_ley, False, False
        nuevo_html = html_reemplazar(
            html_ley, viejo, nuevo, nota=nota, articulo=num_articulo
        )
        quitado = truncar_extracto(viejo) if viejo else (
            f'Artículo {num_articulo} — texto anterior tachado en el consolidado.'
            if num_articulo
            else ''
        )
        informe.agregar(
            _etiqueta_clave(clave),
            f"{_etiqueta_clave(clave)} — texto anterior tachado y texto vigente a continuación{(' en ' + ref) if ref else ''}.",
            quitado=quitado,
            agregado=truncar_extracto(nuevo),
            articulo=ref,
            norma_fuente=nf,
        )
        return nuevo_html, False, False

    if clave == 'SE COMPLEMENTA':
        complemento = cuerpo.strip()
        if complemento:
            nuevo_html = html_complementar(html_ley, complemento, nota=nota)
            informe.agregar(
                'SE COMPLEMENTA',
                'SE COMPLEMENTA — texto añadido al final de la ley.',
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
    ley_codigo: str = '',
    ley_titulo: str = '',
    archivo_mod: str = '',
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

    plano_mod = html_a_texto_plano(texto_mod) if '<' in texto_mod else texto_mod

    if contiene_abrogacion(plano_mod):
        resultado.texto = html_abrogar(
            html_ley,
            'NORMA ABROGADA EN SU TOTALIDAD',
            _nota_cambio('ABROGACION', archivo_mod),
        )
        resultado.abrogada = True
        resultado.detenido_por_abrogacion = True
        resultado.claves_aplicadas.append('ABROGACIÓN')
        informe.agregar(
            'ABROGACIÓN',
            'ABROGACIÓN TOTAL detectada en el documento modificatorio.',
            quitado=truncar_extracto(html_a_texto_plano(html_ley)),
            norma_fuente=norma_txt,
        )
        audit = auditar_modificacion(
            texto_ley, texto_mod, [e.to_dict() for e in informe.entradas], norma_txt
        )
        informe.errores_detectados = [a for a in audit.to_list() if a['nivel'] == 'critico']
        informe.advertencias = [a for a in audit.to_list() if a['nivel'] != 'critico']
        resultado.preinforme = informe
        return resultado

    bloques = _dividir_bloques(texto_mod)
    if not bloques:
        resultado.preinforme = informe
        return resultado

    texto = html_ley
    for clave, cuerpo in bloques:
        logger.info('Aplicando %s…', clave)
        texto, abrog, derog_total = _aplicar_bloque(
            texto, clave, cuerpo, informe, archivo_mod=archivo_mod
        )
        resultado.claves_aplicadas.append(_etiqueta_clave(clave))

        if abrog:
            resultado.abrogada = True
            resultado.detenido_por_abrogacion = True
            break
        if derog_total:
            resultado.derogacion_total = True
            break

    resultado.texto = asegurar_html(texto)
    audit = auditar_modificacion(
        texto_ley, texto_mod, [e.to_dict() for e in informe.entradas], norma_txt
    )
    informe.errores_detectados = [a for a in audit.to_list() if a['nivel'] == 'critico']
    informe.advertencias = [a for a in audit.to_list() if a['nivel'] != 'critico']
    resultado.preinforme = informe
    return resultado
