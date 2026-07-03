import re
import time
import unicodedata
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.catalogos.models import (
    EfectoNormativo,
    EntidadEmisora,
    Materia,
    PalabraClaveMateria,
    PatronTipoNorma,
    ReglaEfectoNormativo,
    TipoNorma,
)

from .models import (
    Documento,
    EvidenciaExtraccion,
    HistorialDocumento,
    PropuestaExtraccion,
    ResultadoProcesamiento,
)
from .services import registrar_historial


MESES = {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4,
    'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8,
    'SEPTIEMBRE': 9, 'SETIEMBRE': 9, 'OCTUBRE': 10,
    'NOVIEMBRE': 11, 'DICIEMBRE': 12,
}


class ErrorExtraccion(Exception):
    def __init__(self, codigo, mensaje, *, detalles=None):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles or {}


@dataclass
class Deteccion:
    valor: object
    texto_valor: str
    confianza: float
    pagina: int | None
    fragmento: str
    regla: str


def _normalizar(texto):
    descompuesto = unicodedata.normalize('NFD', texto or '')
    sin_tildes = ''.join(char for char in descompuesto if unicodedata.category(char) != 'Mn')
    return re.sub(r'\s+', ' ', sin_tildes).strip().upper()


def _fragmento(texto, inicio, fin=None, margen=140):
    fin = fin if fin is not None else inicio
    return re.sub(r'\s+', ' ', texto[max(0, inicio - margen):min(len(texto), fin + margen)]).strip()


def _detectar_tipo_y_numero(paginas):
    patrones = PatronTipoNorma.objects.filter(
        activo=True,
        tipo_norma__activo=True,
    ).select_related('tipo_norma').order_by('prioridad', 'id')
    for pagina in paginas[:3]:
        for patron in patrones:
            try:
                coincidencia = re.search(patron.patron_regex, pagina.texto, re.IGNORECASE | re.MULTILINE)
            except re.error:
                continue
            if not coincidencia:
                continue
            tipo = Deteccion(
                patron.tipo_norma,
                f'{patron.tipo_norma.codigo} - {patron.tipo_norma.nombre}',
                97,
                pagina.numero_pagina,
                _fragmento(pagina.texto, coincidencia.start(), coincidencia.end()),
                f'Patrón configurable: {patron.patron_regex}',
            )
            numero = None
            if coincidencia.lastindex and coincidencia.group(1):
                valor = coincidencia.group(1).strip()
                numero = Deteccion(
                    valor, valor, 96, pagina.numero_pagina,
                    tipo.fragmento, 'Grupo de captura del patrón de tipo de norma',
                )
            return tipo, numero

    tipos = TipoNorma.objects.filter(activo=True).order_by('-nombre')
    for pagina in paginas[:3]:
        normalizado = _normalizar(pagina.texto)
        for tipo in tipos:
            nombre = _normalizar(tipo.nombre)
            coincidencia = re.search(rf'\b{re.escape(nombre)}\b', normalizado)
            if coincidencia:
                return Deteccion(
                    tipo, f'{tipo.codigo} - {tipo.nombre}', 75,
                    pagina.numero_pagina,
                    _fragmento(pagina.texto, coincidencia.start(), coincidencia.end()),
                    'Coincidencia con el nombre del catálogo',
                ), None
    return None, None


def _detectar_numero(paginas):
    patron = re.compile(
        r'\b(?:N(?:[\s.]*(?:RO|UMERO))?|NRO|NUMERO|N[\u00b0º])\s*[:.-]?\s*([A-Z]{0,5}[-/]?\d+(?:[-/]\d{2,4})?)',
        re.IGNORECASE,
    )
    for pagina in paginas[:3]:
        texto = _normalizar(pagina.texto)
        coincidencia = patron.search(texto)
        if coincidencia:
            valor = coincidencia.group(1).strip()
            return Deteccion(
                valor, valor, 85, pagina.numero_pagina,
                _fragmento(pagina.texto, coincidencia.start(), coincidencia.end()),
                'Número cercano a un indicador Nº/NRO/NUMERO',
            )
    return None


def _fecha_valida(dia, mes, anio):
    try:
        anio = int(anio)
        if anio < 100:
            anio += 2000 if anio < 50 else 1900
        return date(anio, int(mes), int(dia))
    except (TypeError, ValueError):
        return None


def _detectar_fecha(paginas):
    literal = re.compile(
        r'\b(?:DE\s+)?(\d{1,2})\s+DE\s+(' + '|'.join(MESES) + r')\s+DE\s+(\d{2,4})\b',
        re.IGNORECASE,
    )
    numerica = re.compile(r'\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b')
    for pagina in paginas[:3]:
        texto = _normalizar(pagina.texto)
        coincidencia = literal.search(texto)
        if coincidencia:
            valor = _fecha_valida(coincidencia.group(1), MESES[coincidencia.group(2).upper()], coincidencia.group(3))
            if valor:
                return Deteccion(
                    valor, valor.isoformat(), 95, pagina.numero_pagina,
                    _fragmento(pagina.texto, coincidencia.start(), coincidencia.end()),
                    'Fecha literal en español',
                )
        for coincidencia in numerica.finditer(texto):
            valor = _fecha_valida(*coincidencia.groups())
            if valor:
                return Deteccion(
                    valor, valor.isoformat(), 88, pagina.numero_pagina,
                    _fragmento(pagina.texto, coincidencia.start(), coincidencia.end()),
                    'Fecha numérica',
                )
    return None


def _detectar_titulo(paginas, tipo, numero):
    nombres_tipo = [_normalizar(item.nombre) for item in TipoNorma.objects.filter(activo=True)]
    candidatos = []
    for pagina in paginas[:1]:
        lineas = [re.sub(r'\s+', ' ', linea).strip(' -:;') for linea in pagina.texto.splitlines()]
        for indice, linea in enumerate(lineas[:40]):
            normalizada = _normalizar(linea)
            siguiente_linea = _normalizar(lineas[indice + 1]) if indice + 1 < len(lineas) else ''
            if re.search(r'\bARTICULO\s+(?:1|PRIMERO)\b', normalizada):
                break
            if not 5 <= len(linea) <= 250:
                continue
            if 'PRESIDENTE' in siguiente_linea:
                continue
            if any(nombre in normalizada for nombre in nombres_tipo) and re.search(r'\d', normalizada):
                continue
            if re.search(
                r'\bARTICULO\b|\bGACETA\b|\bPAGINA\b|\bDE\s+\d{4}\b|'
                r'\bPRESIDENTE\b|\bASAMBLEA\b|\bDECRETA\b|\bPOR CUANTO\b|'
                r'\bCAPITULO\b|\bDISPOSICIONES\b|\bESTADO PLURINACIONAL\b',
                normalizada,
            ):
                continue
            if re.fullmatch(r'[\d\s./-]+', normalizada):
                continue
            letras = [char for char in linea if char.isalpha()]
            mayusculas = sum(char.isupper() for char in letras) / max(1, len(letras))
            puntos = 35 + min(len(linea), 80) / 4 + mayusculas * 30
            if any(palabra in normalizada for palabra in ('CODIGO', 'REGLAMENTO', 'LEY', 'ESTATUTO')):
                puntos += 20
            if tipo and _normalizar(tipo.valor.nombre) == normalizada:
                puntos -= 35
            candidatos.append((puntos, pagina, indice, linea))
    if not candidatos:
        if tipo and numero:
            valor = f'{tipo.valor.nombre} N° {numero.valor}'
            return Deteccion(
                valor, valor, 52, tipo.pagina, tipo.fragmento,
                'Título genérico por ausencia de encabezado normativo explícito',
            )
        return None
    _, pagina, indice, linea = max(candidatos, key=lambda item: item[0])
    inicio = pagina.texto.find(linea)
    return Deteccion(
        linea.title() if linea.isupper() else linea,
        linea.title() if linea.isupper() else linea,
        72,
        pagina.numero_pagina,
        _fragmento(pagina.texto, max(0, inicio), max(0, inicio) + len(linea)),
        f'Línea destacada de portada (línea {indice + 1})',
    )


def _detectar_objeto(paginas):
    inicio_articulo = re.compile(r'ART[IÍ]CULO\s+(?:1|PRIMERO)(?:\s*[\u00b0º.]*)\s*[:.-]?', re.IGNORECASE)
    siguiente = re.compile(r'ART[IÍ]CULO\s+(?:2|SEGUNDO)(?:\s*[\u00b0º.]*)\s*[:.-]?', re.IGNORECASE)
    for posicion, pagina in enumerate(paginas):
        inicio = inicio_articulo.search(pagina.texto)
        if not inicio:
            continue
        partes = [pagina.texto[inicio.end():]]
        for siguiente_pagina in paginas[posicion + 1:posicion + 3]:
            partes.append(siguiente_pagina.texto)
        contenido = '\n'.join(partes)
        fin = siguiente.search(contenido)
        objeto = contenido[:fin.start() if fin else 2000]
        objeto = re.sub(r'\s+', ' ', objeto).strip(' .-:')[:2000]
        if objeto:
            confianza = 97 if re.search(r'\b(?:TIENE|TIENEN)\s+POR\s+OBJETO\b', _normalizar(objeto)) else 86
            return Deteccion(
                objeto, objeto, confianza, pagina.numero_pagina,
                _fragmento(pagina.texto, inicio.start(), min(len(pagina.texto), inicio.end() + 350)),
                'Contenido del Artículo 1 hasta el Artículo 2',
            )
    return None


def _detectar_efecto(paginas):
    reglas = ReglaEfectoNormativo.objects.filter(
        activo=True,
        efecto_normativo__activo=True,
    ).select_related('efecto_normativo').order_by('prioridad', 'id')
    for pagina in paginas:
        texto = _normalizar(pagina.texto)
        for regla in reglas:
            expresion = _normalizar(regla.expresion)
            posicion = texto.find(expresion)
            if posicion >= 0:
                efecto = regla.efecto_normativo
                return Deteccion(
                    efecto, f'{efecto.codigo} - {efecto.nombre}', 92,
                    pagina.numero_pagina,
                    _fragmento(pagina.texto, posicion, posicion + len(expresion)),
                    f'Regla configurable: {regla.expresion}',
                )
    originaria = EfectoNormativo.objects.filter(codigo='O', activo=True).first()
    if originaria:
        return Deteccion(
            originaria, f'{originaria.codigo} - {originaria.nombre}', 65,
            None, '', 'Sin expresiones abrogatorias o derogatorias detectadas',
        )
    return None


def _detectar_materia(paginas):
    texto = _normalizar('\n'.join(pagina.texto for pagina in paginas))
    puntajes = {}
    primera = {}
    reglas = PalabraClaveMateria.objects.filter(
        activo=True,
        materia__activo=True,
    ).select_related('materia')
    for regla in reglas:
        palabra = _normalizar(regla.palabra_clave)
        coincidencias = list(re.finditer(rf'\b{re.escape(palabra)}\w*', texto))
        if coincidencias:
            puntajes[regla.materia] = puntajes.get(regla.materia, 0) + len(coincidencias) * regla.peso
            primera.setdefault(regla.materia, regla.palabra_clave)
    if not puntajes:
        return None
    materia, puntaje = max(puntajes.items(), key=lambda item: item[1])
    total = sum(puntajes.values())
    confianza = min(95, 55 + (puntaje / max(1, total)) * 35)
    palabra = primera[materia]
    for pagina in paginas:
        posicion = _normalizar(pagina.texto).find(_normalizar(palabra))
        if posicion >= 0:
            return Deteccion(
                materia, f'{materia.codigo} - {materia.nombre}', confianza,
                pagina.numero_pagina,
                _fragmento(pagina.texto, posicion, posicion + len(palabra)),
                f'Palabras clave ponderadas; puntaje {puntaje}',
            )
    return None


def _detectar_entidad(paginas, tipo):
    for pagina in paginas[:5]:
        texto = _normalizar(pagina.texto)
        for entidad in EntidadEmisora.objects.filter(activo=True).order_by('-nombre'):
            nombre = _normalizar(entidad.nombre)
            posicion = texto.find(nombre)
            regla = 'Nombre completo de entidad en el texto'
            if posicion < 0 and len(entidad.sigla) >= 3:
                coincidencia = re.search(rf'\b{re.escape(_normalizar(entidad.sigla))}\b', texto)
                posicion = coincidencia.start() if coincidencia else -1
                regla = 'Sigla de entidad en el texto'
            if posicion >= 0:
                return Deteccion(
                    entidad, f'{entidad.sigla} - {entidad.nombre}', 90,
                    pagina.numero_pagina,
                    _fragmento(pagina.texto, posicion, posicion + len(nombre)),
                    regla,
                )
    if tipo and tipo.valor.codigo == 'L':
        entidad = EntidadEmisora.objects.filter(codigo='ALP', activo=True).first()
        if entidad:
            return Deteccion(
                entidad, f'{entidad.sigla} - {entidad.nombre}', 60,
                tipo.pagina, tipo.fragmento,
                'Sugerencia por tipo Ley; requiere verificación jurídica',
            )
    return None


def detectar_datos(paginas):
    tipo, numero = _detectar_tipo_y_numero(paginas)
    numero = numero or _detectar_numero(paginas)
    detecciones = {
        EvidenciaExtraccion.Campo.TIPO_NORMA: tipo,
        EvidenciaExtraccion.Campo.NUMERO: numero,
        EvidenciaExtraccion.Campo.FECHA_EMISION: _detectar_fecha(paginas),
        EvidenciaExtraccion.Campo.TITULO: _detectar_titulo(paginas, tipo, numero),
        EvidenciaExtraccion.Campo.OBJETO: _detectar_objeto(paginas),
        EvidenciaExtraccion.Campo.EFECTO_NORMATIVO: _detectar_efecto(paginas),
        EvidenciaExtraccion.Campo.MATERIA: _detectar_materia(paginas),
        EvidenciaExtraccion.Campo.ENTIDAD_EMISORA: _detectar_entidad(paginas, tipo),
    }
    confianza = sum(item.confianza if item else 0 for item in detecciones.values()) / len(detecciones)
    return detecciones, round(confianza, 2)


def _marcar_error(documento_id, error, inicio):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento_id)
        propuesta, _ = PropuestaExtraccion.objects.get_or_create(documento=documento)
        propuesta.estado = PropuestaExtraccion.Estado.ERROR
        propuesta.finalizado_at = timezone.now()
        propuesta.duracion_ms = int((time.monotonic() - inicio) * 1000)
        propuesta.error_codigo = getattr(error, 'codigo', 'ERROR_INTERNO')
        propuesta.error_mensaje = getattr(error, 'mensaje', 'Ocurrió un error interno durante la extracción.')
        propuesta.detalles_tecnicos = getattr(error, 'detalles', {})
        propuesta.save()
        registrar_historial(
            documento,
            HistorialDocumento.Accion.EXTRACCION_ERROR,
            estado_anterior=documento.estado,
            estado_nuevo=documento.estado,
            descripcion=f'{propuesta.error_codigo}: {propuesta.error_mensaje}',
        )


def extraer_datos_juridicos(documento_id):
    inicio = time.monotonic()
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento_id)
        if documento.estado not in {
            Documento.Estado.PENDIENTE_EXTRACCION,
            Documento.Estado.PENDIENTE_REVISION,
        }:
            raise ErrorExtraccion(
                'ESTADO_INVALIDO',
                'El documento debe estar pendiente de extracción o revisión.',
            )
        try:
            resultado = documento.resultado_procesamiento
        except ResultadoProcesamiento.DoesNotExist as exc:
            raise ErrorExtraccion(
                'SIN_PROCESAMIENTO',
                'El documento no tiene texto procesado.',
            ) from exc
        if resultado.estado != ResultadoProcesamiento.Estado.COMPLETADO:
            raise ErrorExtraccion(
                'PROCESAMIENTO_INCOMPLETO',
                'El procesamiento técnico todavía no está completo.',
            )
        propuesta, _ = PropuestaExtraccion.objects.get_or_create(documento=documento)
        if propuesta.estado == PropuestaExtraccion.Estado.EXTRAYENDO:
            return propuesta
        propuesta.estado = PropuestaExtraccion.Estado.EXTRAYENDO
        propuesta.intentos += 1
        propuesta.iniciado_at = timezone.now()
        propuesta.finalizado_at = None
        propuesta.error_codigo = ''
        propuesta.error_mensaje = ''
        propuesta.detalles_tecnicos = {}
        propuesta.save()
        registrar_historial(
            documento,
            HistorialDocumento.Accion.EXTRACCION_INICIADA,
            estado_anterior=documento.estado,
            estado_nuevo=documento.estado,
            descripcion=f'Extracción jurídica iniciada (intento {propuesta.intentos}).',
        )

    try:
        paginas = list(resultado.paginas.all().order_by('numero_pagina'))
        if not paginas or not any(pagina.texto.strip() for pagina in paginas):
            raise ErrorExtraccion('SIN_TEXTO', 'No existe texto extraído para analizar.')
        detecciones, confianza_global = detectar_datos(paginas)
        with transaction.atomic():
            documento = Documento.objects.select_for_update().get(pk=documento_id)
            propuesta = PropuestaExtraccion.objects.select_for_update().get(documento=documento)
            propuesta.tipo_norma_propuesto = detecciones[EvidenciaExtraccion.Campo.TIPO_NORMA].valor if detecciones[EvidenciaExtraccion.Campo.TIPO_NORMA] else None
            propuesta.numero_propuesto = detecciones[EvidenciaExtraccion.Campo.NUMERO].valor if detecciones[EvidenciaExtraccion.Campo.NUMERO] else ''
            propuesta.fecha_emision_propuesta = detecciones[EvidenciaExtraccion.Campo.FECHA_EMISION].valor if detecciones[EvidenciaExtraccion.Campo.FECHA_EMISION] else None
            propuesta.titulo_propuesto = detecciones[EvidenciaExtraccion.Campo.TITULO].valor if detecciones[EvidenciaExtraccion.Campo.TITULO] else ''
            propuesta.objeto_propuesto = detecciones[EvidenciaExtraccion.Campo.OBJETO].valor if detecciones[EvidenciaExtraccion.Campo.OBJETO] else ''
            propuesta.efecto_normativo_propuesto = detecciones[EvidenciaExtraccion.Campo.EFECTO_NORMATIVO].valor if detecciones[EvidenciaExtraccion.Campo.EFECTO_NORMATIVO] else None
            propuesta.materia_propuesta = detecciones[EvidenciaExtraccion.Campo.MATERIA].valor if detecciones[EvidenciaExtraccion.Campo.MATERIA] else None
            propuesta.entidad_emisora_propuesta = detecciones[EvidenciaExtraccion.Campo.ENTIDAD_EMISORA].valor if detecciones[EvidenciaExtraccion.Campo.ENTIDAD_EMISORA] else None
            propuesta.confianza_global = Decimal(str(confianza_global))
            propuesta.estado = PropuestaExtraccion.Estado.COMPLETADA
            propuesta.finalizado_at = timezone.now()
            propuesta.duracion_ms = int((time.monotonic() - inicio) * 1000)
            propuesta.detalles_tecnicos = {
                'campos_detectados': sum(bool(item) for item in detecciones.values()),
                'campos_totales': len(detecciones),
                'motor': 'reglas_catalogos_v1',
            }
            propuesta.save()
            propuesta.evidencias.all().delete()
            EvidenciaExtraccion.objects.bulk_create([
                EvidenciaExtraccion(
                    propuesta=propuesta,
                    campo=campo,
                    valor_propuesto=deteccion.texto_valor,
                    confianza=Decimal(str(round(deteccion.confianza, 2))),
                    numero_pagina=deteccion.pagina,
                    fragmento=deteccion.fragmento,
                    regla_aplicada=deteccion.regla,
                )
                for campo, deteccion in detecciones.items()
                if deteccion
            ])
            anterior = documento.estado
            documento.estado = Documento.Estado.PENDIENTE_REVISION
            documento.save(update_fields=('estado', 'updated_at'))
            registrar_historial(
                documento,
                HistorialDocumento.Accion.EXTRACCION_COMPLETADA,
                estado_anterior=anterior,
                estado_nuevo=documento.estado,
                descripcion=(
                    f'Propuesta jurídica generada con {confianza_global:.2f}% '
                    'de confianza global. Requiere revisión humana.'
                ),
            )
        return propuesta
    except Exception as exc:
        error = exc if isinstance(exc, ErrorExtraccion) else ErrorExtraccion(
            'ERROR_INTERNO',
            'Ocurrió un error interno durante la extracción.',
        )
        _marcar_error(documento_id, error, inicio)
        raise error from exc
