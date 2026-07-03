import hashlib
import shutil
import subprocess
import tempfile
import time
from decimal import Decimal
from pathlib import Path

import fitz
import pytesseract
from PIL import Image
from django.conf import settings
from django.core.files import File
from django.db import transaction
from django.utils import timezone

from .models import (
    ArchivoDocumento,
    Documento,
    HistorialDocumento,
    ResultadoProcesamiento,
    TextoPagina,
)
from .pdf_analysis import pagina_dominada_por_imagen
from .services import registrar_historial


class ErrorProcesamiento(Exception):
    def __init__(self, codigo, mensaje, *, detalles=None):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles or {}


def _texto_suficiente(texto):
    minimo = getattr(settings, 'PDF_MIN_TEXT_CHARS_PER_PAGE', 30)
    return len(''.join(texto.split())) >= minimo


def _analizar_pdf(ruta):
    try:
        with fitz.open(ruta) as pdf:
            textos = [pagina.get_text('text') for pagina in pdf]
            paginas_imagen = [pagina_dominada_por_imagen(pagina) for pagina in pdf]
    except Exception as exc:
        raise ErrorProcesamiento(
            'PDF_ILEGIBLE',
            'No se pudo abrir el PDF original para procesarlo.',
        ) from exc
    if not textos:
        raise ErrorProcesamiento('PDF_SIN_PAGINAS', 'El PDF no contiene páginas.')
    # A scanned PDF can already have an OCR text layer.  Treat it as scanned
    # when an image occupies almost the whole page, even if text is selectable.
    paginas_texto = [
        _texto_suficiente(texto) and not es_imagen
        for texto, es_imagen in zip(textos, paginas_imagen)
    ]
    cantidad_texto = sum(paginas_texto)
    if cantidad_texto == len(textos):
        tipo = ResultadoProcesamiento.TipoPdf.TEXTO
    elif cantidad_texto == 0:
        tipo = ResultadoProcesamiento.TipoPdf.ESCANEADO
    else:
        tipo = ResultadoProcesamiento.TipoPdf.MIXTO
    return textos, paginas_texto, tipo


def _ejecutar_ocr(entrada, salida):
    comando = [
        getattr(settings, 'OCRMYPDF_COMMAND', 'ocrmypdf'),
        '--skip-text',
        '--deskew',
        '--rotate-pages',
        '--optimize',
        '1',
        '--language',
        getattr(settings, 'OCR_LANGUAGE', 'spa'),
        str(entrada),
        str(salida),
    ]
    try:
        proceso = subprocess.run(
            comando,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=getattr(settings, 'OCR_PROCESS_TIMEOUT', 1800),
            check=False,
        )
    except FileNotFoundError as exc:
        raise ErrorProcesamiento(
            'OCR_NO_DISPONIBLE',
            'OCRmyPDF no está instalado o no está disponible en el worker.',
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise ErrorProcesamiento(
            'OCR_TIMEOUT',
            'El OCR superó el tiempo máximo permitido.',
        ) from exc
    if proceso.returncode != 0 or not salida.exists():
        detalle = (proceso.stderr or proceso.stdout or '')[-4000:]
        raise ErrorProcesamiento(
            'OCR_FALLIDO',
            'OCRmyPDF no pudo procesar el documento.',
            detalles={'salida_ocr': detalle, 'codigo_salida': proceso.returncode},
        )
    return {'codigo_salida': proceso.returncode}


def _confianza_pagina(pagina):
    escala = getattr(settings, 'OCR_CONFIDENCE_DPI', 150) / 72
    pixmap = pagina.get_pixmap(matrix=fitz.Matrix(escala, escala), alpha=False)
    imagen = Image.frombytes('RGB', (pixmap.width, pixmap.height), pixmap.samples)
    datos = pytesseract.image_to_data(
        imagen,
        lang=getattr(settings, 'OCR_LANGUAGE', 'spa'),
        output_type=pytesseract.Output.DICT,
    )
    valores = []
    for valor in datos.get('conf', []):
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            continue
        if numero >= 0:
            valores.append(numero)
    return round(sum(valores) / len(valores), 2) if valores else None


def _extraer_resultado(ruta, paginas_texto_original):
    paginas = []
    confianzas = []
    try:
        with fitz.open(ruta) as pdf:
            for indice, pagina in enumerate(pdf):
                texto = pagina.get_text('text').strip()
                uso_ocr = not paginas_texto_original[indice]
                confianza = _confianza_pagina(pagina) if uso_ocr else None
                if confianza is not None:
                    confianzas.append(confianza)
                paginas.append({
                    'numero_pagina': indice + 1,
                    'metodo': TextoPagina.Metodo.OCR if uso_ocr else TextoPagina.Metodo.TEXTO_ORIGINAL,
                    'texto': texto,
                    'caracteres': len(texto),
                    'confianza_ocr': Decimal(str(confianza)) if confianza is not None else None,
                })
    except ErrorProcesamiento:
        raise
    except pytesseract.TesseractNotFoundError as exc:
        raise ErrorProcesamiento(
            'TESSERACT_NO_DISPONIBLE',
            'Tesseract no está instalado o no está disponible en el worker.',
        ) from exc
    except Exception as exc:
        raise ErrorProcesamiento(
            'EXTRACCION_FALLIDA',
            'No se pudo extraer el texto del PDF procesado.',
        ) from exc
    promedio = round(sum(confianzas) / len(confianzas), 2) if confianzas else None
    return paginas, promedio


def _hash_archivo(ruta):
    digest = hashlib.sha256()
    with ruta.open('rb') as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b''):
            digest.update(bloque)
    return digest.hexdigest()


def _marcar_error(documento_id, error, inicio):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento_id)
        resultado, _ = ResultadoProcesamiento.objects.get_or_create(documento=documento)
        resultado.estado = ResultadoProcesamiento.Estado.ERROR
        resultado.finalizado_at = timezone.now()
        resultado.duracion_ms = int((time.monotonic() - inicio) * 1000)
        resultado.error_codigo = getattr(error, 'codigo', 'ERROR_INTERNO')
        resultado.error_mensaje = getattr(error, 'mensaje', 'Ocurrió un error interno durante el procesamiento.')
        resultado.detalles_tecnicos = getattr(error, 'detalles', {})
        resultado.save()
        anterior = documento.estado
        documento.estado = Documento.Estado.ERROR
        documento.save(update_fields=('estado', 'updated_at'))
        registrar_historial(
            documento,
            HistorialDocumento.Accion.PROCESAMIENTO_ERROR,
            estado_anterior=anterior,
            estado_nuevo=documento.estado,
            descripcion=f'{resultado.error_codigo}: {resultado.error_mensaje}',
        )


def procesar_documento(documento_id):
    inicio = time.monotonic()
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento_id)
        resultado, _ = ResultadoProcesamiento.objects.get_or_create(documento=documento)
        if (
            documento.estado == Documento.Estado.PROCESANDO
            and resultado.estado == ResultadoProcesamiento.Estado.PROCESANDO
        ):
            return resultado
        if documento.estado not in {
            Documento.Estado.PENDIENTE_PROCESAMIENTO,
            Documento.Estado.ERROR,
        }:
            raise ErrorProcesamiento(
                'ESTADO_INVALIDO',
                'El documento no se encuentra pendiente de procesamiento ni en error.',
            )
        anterior = documento.estado
        documento.estado = Documento.Estado.PROCESANDO
        documento.save(update_fields=('estado', 'updated_at'))
        resultado.estado = ResultadoProcesamiento.Estado.PROCESANDO
        resultado.intentos += 1
        resultado.iniciado_at = timezone.now()
        resultado.finalizado_at = None
        resultado.error_codigo = ''
        resultado.error_mensaje = ''
        resultado.detalles_tecnicos = {}
        resultado.save()
        registrar_historial(
            documento,
            HistorialDocumento.Accion.PROCESAMIENTO_INICIADO,
            estado_anterior=anterior,
            estado_nuevo=documento.estado,
            descripcion=f'Procesamiento técnico iniciado (intento {resultado.intentos}).',
        )

    try:
        original = documento.archivos.get(tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL)
        with tempfile.TemporaryDirectory(prefix='procesamiento-pdf-') as temporal:
            temporal = Path(temporal)
            entrada = temporal / 'original.pdf'
            salida = temporal / 'procesado.pdf'
            with original.archivo.open('rb') as origen, entrada.open('wb') as destino:
                shutil.copyfileobj(origen, destino)

            _, paginas_texto, tipo_pdf = _analizar_pdf(entrada)
            requirio_ocr = tipo_pdf != ResultadoProcesamiento.TipoPdf.TEXTO
            detalles = {}
            if requirio_ocr:
                detalles.update(_ejecutar_ocr(entrada, salida))
            else:
                shutil.copy2(entrada, salida)
            paginas, confianza = _extraer_resultado(salida, paginas_texto)
            if not any(pagina['texto'] for pagina in paginas):
                raise ErrorProcesamiento(
                    'TEXTO_VACIO',
                    'El procesamiento terminó, pero no fue posible extraer texto.',
                )

            nuevo_archivo = None
            archivo_anterior = None
            with transaction.atomic():
                documento = Documento.objects.select_for_update().get(pk=documento_id)
                resultado = ResultadoProcesamiento.objects.select_for_update().get(documento=documento)
                anterior_procesado = documento.archivos.filter(
                    tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_PROCESADO,
                ).first()
                if anterior_procesado:
                    archivo_anterior = anterior_procesado.archivo
                    anterior_procesado.delete()
                with salida.open('rb') as contenido:
                    nuevo_archivo = ArchivoDocumento.objects.create(
                        documento=documento,
                        tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_PROCESADO,
                        archivo=File(contenido, name='procesado.pdf'),
                        nombre_original=f'{Path(original.nombre_original).stem}_procesado.pdf',
                        mime_type='application/pdf',
                        tamano_bytes=salida.stat().st_size,
                        hash_sha256=_hash_archivo(salida),
                    )
                resultado.paginas.all().delete()
                TextoPagina.objects.bulk_create(
                    [TextoPagina(resultado=resultado, **pagina) for pagina in paginas]
                )
                resultado.estado = ResultadoProcesamiento.Estado.COMPLETADO
                resultado.tipo_pdf = tipo_pdf
                resultado.numero_paginas = len(paginas)
                resultado.paginas_con_texto = sum(paginas_texto)
                resultado.paginas_con_ocr = len(paginas) - sum(paginas_texto)
                resultado.requirio_ocr = requirio_ocr
                resultado.ocr_aplicado = requirio_ocr
                resultado.confianza_ocr = Decimal(str(confianza)) if confianza is not None else None
                resultado.caracteres_extraidos = sum(pagina['caracteres'] for pagina in paginas)
                resultado.finalizado_at = timezone.now()
                resultado.duracion_ms = int((time.monotonic() - inicio) * 1000)
                resultado.detalles_tecnicos = detalles
                resultado.save()
                documento.estado = Documento.Estado.PENDIENTE_EXTRACCION
                documento.save(update_fields=('estado', 'updated_at'))
                registrar_historial(
                    documento,
                    HistorialDocumento.Accion.PROCESAMIENTO_COMPLETADO,
                    estado_anterior=Documento.Estado.PROCESANDO,
                    estado_nuevo=documento.estado,
                    descripcion=f'Procesamiento completado: {len(paginas)} páginas, OCR: {"sí" if requirio_ocr else "no"}.',
                )
                if archivo_anterior:
                    transaction.on_commit(lambda: archivo_anterior.delete(save=False))
            return resultado
    except Exception as exc:
        error = exc if isinstance(exc, ErrorProcesamiento) else ErrorProcesamiento(
            'ERROR_INTERNO',
            'Ocurrió un error interno durante el procesamiento.',
        )
        _marcar_error(documento_id, error, inicio)
        raise error from exc
