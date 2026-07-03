import hashlib
import re
import time
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal
from difflib import SequenceMatcher

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import (
    AlertaCalidad,
    ArchivoDocumento,
    CoincidenciaDocumento,
    Documento,
    EvaluacionCalidad,
    EvidenciaExtraccion,
    HistorialDocumento,
    PropuestaExtraccion,
    ResultadoProcesamiento,
)
from .services import registrar_historial


class ErrorCalidad(Exception):
    def __init__(self, codigo, mensaje, *, detalles=None):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles or {}


@dataclass
class AlertaDetectada:
    codigo: str
    titulo: str
    descripcion: str
    severidad: str
    documento_relacionado: Documento | None = None
    evidencia: dict = field(default_factory=dict)


@dataclass
class CoincidenciaDetectada:
    documento: Documento
    tipo: str
    similitud_titulo: float
    similitud_contenido: float
    misma_fecha: bool
    mismo_identificador: bool
    detalles: dict = field(default_factory=dict)


def _normalizar(texto):
    descompuesto = unicodedata.normalize('NFD', texto or '')
    sin_tildes = ''.join(char for char in descompuesto if unicodedata.category(char) != 'Mn')
    return re.sub(r'[^A-Z0-9]+', ' ', sin_tildes.upper()).strip()


def _texto_documento(documento):
    try:
        paginas = documento.resultado_procesamiento.paginas.all().order_by('numero_pagina')
    except ResultadoProcesamiento.DoesNotExist:
        return ''
    return '\n'.join(pagina.texto for pagina in paginas).strip()


def _hash_contenido(texto):
    return hashlib.sha256(_normalizar(texto).encode('utf-8')).hexdigest()


def _similitud_titulo(uno, dos):
    primero, segundo = _normalizar(uno), _normalizar(dos)
    if not primero or not segundo:
        return 0.0
    return round(SequenceMatcher(None, primero, segundo).ratio() * 100, 2)


def _shingles(texto, tamano=5):
    tokens = _normalizar(texto).split()[:20000]
    if len(tokens) < tamano:
        return {' '.join(tokens)} if tokens else set()
    return {' '.join(tokens[indice:indice + tamano]) for indice in range(len(tokens) - tamano + 1)}


def _similitud_contenido(uno, dos):
    primero, segundo = _shingles(uno), _shingles(dos)
    if not primero or not segundo:
        return 0.0
    return round(len(primero & segundo) / len(primero | segundo) * 100, 2)


def _valor_numero(propuesta):
    return _normalizar(propuesta.numero_propuesto).replace(' ', '')


def _evaluar_campos(propuesta, resultado, texto, alertas):
    campos = (
        ('TIPO_NORMA_FALTANTE', 'Tipo de norma no detectado', propuesta.tipo_norma_propuesto_id, AlertaCalidad.Severidad.GRAVE),
        ('NUMERO_FALTANTE', 'Número de norma no detectado', propuesta.numero_propuesto, AlertaCalidad.Severidad.GRAVE),
        ('FECHA_FALTANTE', 'Fecha de emisión no detectada', propuesta.fecha_emision_propuesta, AlertaCalidad.Severidad.GRAVE),
        ('TITULO_FALTANTE', 'Título no detectado', propuesta.titulo_propuesto, AlertaCalidad.Severidad.LEVE),
        ('OBJETO_FALTANTE', 'No se encontró el Artículo 1 u objeto', propuesta.objeto_propuesto, AlertaCalidad.Severidad.LEVE),
        ('EFECTO_FALTANTE', 'Efecto normativo no sugerido', propuesta.efecto_normativo_propuesto_id, AlertaCalidad.Severidad.LEVE),
        ('MATERIA_FALTANTE', 'Materia no sugerida', propuesta.materia_propuesta_id, AlertaCalidad.Severidad.LEVE),
        ('ENTIDAD_FALTANTE', 'Entidad emisora no sugerida', propuesta.entidad_emisora_propuesta_id, AlertaCalidad.Severidad.LEVE),
    )
    for codigo, titulo, valor, severidad in campos:
        if not valor:
            alertas.append(AlertaDetectada(
                codigo, titulo,
                'La propuesta automática no cuenta con evidencia suficiente para este campo.',
                severidad,
            ))

    confianza_global = float(propuesta.confianza_global or 0)
    umbral_global = getattr(settings, 'QUALITY_MIN_EXTRACTION_CONFIDENCE', 70)
    if confianza_global < 55:
        alertas.append(AlertaDetectada(
            'EXTRACCION_MUY_BAJA', 'Extracción poco confiable',
            f'La confianza global es {confianza_global:.2f}%.',
            AlertaCalidad.Severidad.GRAVE,
            evidencia={'confianza_global': confianza_global},
        ))
    elif confianza_global < umbral_global:
        alertas.append(AlertaDetectada(
            'EXTRACCION_BAJA', 'La propuesta requiere verificación',
            f'La confianza global es {confianza_global:.2f}%, inferior al umbral de {umbral_global}%.',
            AlertaCalidad.Severidad.LEVE,
            evidencia={'confianza_global': confianza_global, 'umbral': umbral_global},
        ))

    criticos = {
        EvidenciaExtraccion.Campo.TIPO_NORMA,
        EvidenciaExtraccion.Campo.NUMERO,
        EvidenciaExtraccion.Campo.FECHA_EMISION,
    }
    for evidencia in propuesta.evidencias.all():
        confianza = float(evidencia.confianza)
        if confianza < 50 and evidencia.campo in criticos:
            alertas.append(AlertaDetectada(
                f'CONFIANZA_CRITICA_{evidencia.campo}',
                f'Baja confianza en {evidencia.get_campo_display()}',
                f'El campo tiene solamente {confianza:.2f}% de confianza.',
                AlertaCalidad.Severidad.GRAVE,
                evidencia={'campo': evidencia.campo, 'confianza': confianza},
            ))
        elif confianza < 65:
            alertas.append(AlertaDetectada(
                f'CONFIANZA_BAJA_{evidencia.campo}',
                f'Revisar {evidencia.get_campo_display()}',
                f'El campo tiene {confianza:.2f}% de confianza.',
                AlertaCalidad.Severidad.LEVE,
                evidencia={'campo': evidencia.campo, 'confianza': confianza},
            ))

    minimo_texto = getattr(settings, 'QUALITY_MIN_TEXT_CHARS', 200)
    if len(texto) < minimo_texto:
        alertas.append(AlertaDetectada(
            'TEXTO_DEMASIADO_CORTO', 'Texto extraído demasiado corto',
            f'Solo se extrajeron {len(texto)} caracteres; se esperaban al menos {minimo_texto}.',
            AlertaCalidad.Severidad.GRAVE,
            evidencia={'caracteres': len(texto), 'minimo': minimo_texto},
        ))

    if resultado.estado != ResultadoProcesamiento.Estado.COMPLETADO:
        alertas.append(AlertaDetectada(
            'PROCESAMIENTO_TECNICO_INCOMPLETO', 'Procesamiento técnico incompleto',
            resultado.error_mensaje or 'El procesamiento técnico no terminó correctamente.',
            AlertaCalidad.Severidad.GRAVE,
            evidencia={'estado': resultado.estado, 'error': resultado.error_codigo},
        ))
    if resultado.ocr_aplicado:
        confianza_ocr = float(resultado.confianza_ocr or 0)
        umbral_ocr = getattr(settings, 'QUALITY_MIN_OCR_CONFIDENCE', 75)
        if confianza_ocr < 55:
            severidad = AlertaCalidad.Severidad.GRAVE
        elif confianza_ocr < umbral_ocr:
            severidad = AlertaCalidad.Severidad.LEVE
        else:
            severidad = None
        if severidad:
            alertas.append(AlertaDetectada(
                'OCR_BAJA_CALIDAD', 'Calidad OCR insuficiente',
                f'La confianza OCR es {confianza_ocr:.2f}%.',
                severidad,
                evidencia={'confianza_ocr': confianza_ocr, 'umbral': umbral_ocr},
            ))


def _buscar_coincidencias(documento, propuesta, texto, alertas):
    coincidencias = []
    duplicado = None
    original = documento.archivos.filter(
        tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL,
    ).first()
    if original:
        archivo_igual = ArchivoDocumento.objects.filter(
            tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL,
            hash_sha256=original.hash_sha256,
            documento__created_at__lt=documento.created_at,
            documento__eliminado_at__isnull=True,
        ).exclude(documento=documento).select_related('documento').order_by('documento__created_at').first()
        if archivo_igual:
            canonico = archivo_igual.documento.documento_canonico or archivo_igual.documento
            duplicado = canonico
            coincidencias.append(CoincidenciaDetectada(
                canonico, CoincidenciaDocumento.Tipo.HASH_IDENTICO,
                100, 100, True, True,
                {'hash_sha256': original.hash_sha256},
            ))
            alertas.append(AlertaDetectada(
                'PDF_IDENTICO', 'El archivo PDF ya fue cargado',
                f'El hash SHA-256 coincide con {canonico.codigo_interno}.',
                AlertaCalidad.Severidad.GRAVE,
                canonico,
                {'hash_sha256': original.hash_sha256},
            ))

    candidatos = PropuestaExtraccion.objects.filter(
        estado=PropuestaExtraccion.Estado.COMPLETADA,
        documento__created_at__lt=documento.created_at,
        documento__eliminado_at__isnull=True,
    ).exclude(documento=documento).select_related(
        'documento', 'documento__documento_canonico', 'tipo_norma_propuesto',
    ).prefetch_related('documento__resultado_procesamiento__paginas')
    numero_actual = _valor_numero(propuesta)
    for candidato in candidatos:
        documento_candidato = candidato.documento.documento_canonico or candidato.documento
        titulo_similar = _similitud_titulo(propuesta.titulo_propuesto, candidato.titulo_propuesto)
        mismo_tipo = bool(
            propuesta.tipo_norma_propuesto_id
            and propuesta.tipo_norma_propuesto_id == candidato.tipo_norma_propuesto_id
        )
        mismo_numero = bool(numero_actual and numero_actual == _valor_numero(candidato))
        misma_fecha = bool(
            propuesta.fecha_emision_propuesta
            and propuesta.fecha_emision_propuesta == candidato.fecha_emision_propuesta
        )
        if not (mismo_tipo and mismo_numero) and titulo_similar < 82:
            continue
        texto_candidato = _texto_documento(candidato.documento)
        contenido_similar = _similitud_contenido(texto, texto_candidato)
        mismo_identificador = mismo_tipo and mismo_numero

        if mismo_identificador and misma_fecha and (contenido_similar >= 70 or titulo_similar >= 80):
            tipo = CoincidenciaDocumento.Tipo.MISMA_NORMA
            coincidencias.append(CoincidenciaDetectada(
                documento_candidato, tipo, titulo_similar, contenido_similar,
                misma_fecha, True,
            ))
            if not duplicado:
                duplicado = documento_candidato
                alertas.append(AlertaDetectada(
                    'MISMA_NORMA_OTRO_PDF', 'La norma ya existe con otro archivo',
                    f'Coincide tipo, número y fecha con {documento_candidato.codigo_interno}.',
                    AlertaCalidad.Severidad.GRAVE,
                    documento_candidato,
                    {'similitud_titulo': titulo_similar, 'similitud_contenido': contenido_similar},
                ))
        elif mismo_identificador:
            coincidencias.append(CoincidenciaDetectada(
                documento_candidato,
                CoincidenciaDocumento.Tipo.IDENTIFICADOR_CONFLICTIVO,
                titulo_similar, contenido_similar, misma_fecha, True,
            ))
            alertas.append(AlertaDetectada(
                'IDENTIFICADOR_CONFLICTIVO', 'Mismo identificador con contenido diferente',
                f'{documento_candidato.codigo_interno} tiene el mismo tipo y número, pero fecha o contenido diferentes.',
                AlertaCalidad.Severidad.GRAVE,
                documento_candidato,
                {'misma_fecha': misma_fecha, 'similitud_titulo': titulo_similar, 'similitud_contenido': contenido_similar},
            ))
        elif titulo_similar >= 82:
            coincidencias.append(CoincidenciaDetectada(
                documento_candidato,
                CoincidenciaDocumento.Tipo.CONTENIDO_SIMILAR,
                titulo_similar, contenido_similar, misma_fecha, False,
            ))
            alertas.append(AlertaDetectada(
                'NOMBRE_PARECIDO', 'Nombre parecido a otra norma',
                f'El título se parece al de {documento_candidato.codigo_interno}, pero el identificador no coincide.',
                AlertaCalidad.Severidad.LEVE,
                documento_candidato,
                {'similitud_titulo': titulo_similar, 'similitud_contenido': contenido_similar},
            ))
    return coincidencias, duplicado


def _marcar_error(documento_id, error, inicio):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento_id)
        evaluacion, _ = EvaluacionCalidad.objects.get_or_create(documento=documento)
        evaluacion.estado = EvaluacionCalidad.Estado.ERROR
        evaluacion.finalizado_at = timezone.now()
        evaluacion.duracion_ms = int((time.monotonic() - inicio) * 1000)
        evaluacion.error_codigo = getattr(error, 'codigo', 'ERROR_INTERNO')
        evaluacion.error_mensaje = getattr(error, 'mensaje', 'Ocurrió un error interno durante el control de calidad.')
        evaluacion.metricas = getattr(error, 'detalles', {})
        evaluacion.save()
        documento.estado = Documento.Estado.OBSERVADO
        documento.save(update_fields=('estado', 'updated_at'))
        registrar_historial(
            documento,
            HistorialDocumento.Accion.CALIDAD_ERROR,
            estado_anterior=Documento.Estado.CONTROL_CALIDAD,
            estado_nuevo=documento.estado,
            descripcion=f'{evaluacion.error_codigo}: {evaluacion.error_mensaje}',
        )


def evaluar_calidad_documento(documento_id):
    inicio = time.monotonic()
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento_id)
        if documento.estado not in {
            Documento.Estado.PENDIENTE_REVISION,
            Documento.Estado.PENDIENTE_REVISION_RAPIDA,
            Documento.Estado.OBSERVADO,
            Documento.Estado.LISTO_PARA_CONVERSION,
            Documento.Estado.PENDIENTE_APROBACION,
        }:
            raise ErrorCalidad(
                'ESTADO_INVALIDO',
                'El documento debe tener una propuesta jurídica completada.',
            )
        try:
            propuesta = documento.propuesta_extraccion
            resultado = documento.resultado_procesamiento
        except (PropuestaExtraccion.DoesNotExist, ResultadoProcesamiento.DoesNotExist) as exc:
            raise ErrorCalidad('DATOS_INCOMPLETOS', 'Falta procesamiento técnico o propuesta jurídica.') from exc
        if propuesta.estado != PropuestaExtraccion.Estado.COMPLETADA:
            raise ErrorCalidad('EXTRACCION_INCOMPLETA', 'La propuesta jurídica todavía no está completa.')
        evaluacion, _ = EvaluacionCalidad.objects.get_or_create(documento=documento)
        if evaluacion.estado == EvaluacionCalidad.Estado.ANALIZANDO:
            return evaluacion
        anterior = documento.estado
        documento.estado = Documento.Estado.CONTROL_CALIDAD
        documento.save(update_fields=('estado', 'updated_at'))
        evaluacion.estado = EvaluacionCalidad.Estado.ANALIZANDO
        evaluacion.intentos += 1
        evaluacion.iniciado_at = timezone.now()
        evaluacion.finalizado_at = None
        evaluacion.error_codigo = ''
        evaluacion.error_mensaje = ''
        evaluacion.save()
        registrar_historial(
            documento,
            HistorialDocumento.Accion.CALIDAD_INICIADA,
            estado_anterior=anterior,
            estado_nuevo=documento.estado,
            descripcion=f'Control de calidad iniciado (intento {evaluacion.intentos}).',
        )

    try:
        texto = _texto_documento(documento)
        alertas = []
        _evaluar_campos(propuesta, resultado, texto, alertas)
        coincidencias, duplicado = _buscar_coincidencias(documento, propuesta, texto, alertas)
        alertas = list({
            (item.codigo, item.documento_relacionado.pk if item.documento_relacionado else None): item
            for item in alertas
        }.values())
        coincidencias = list({
            (item.documento.pk, item.tipo): item
            for item in coincidencias
        }.values())
        graves = sum(alerta.severidad == AlertaCalidad.Severidad.GRAVE for alerta in alertas)
        leves = sum(alerta.severidad == AlertaCalidad.Severidad.LEVE for alerta in alertas)
        puntuacion = max(0, 100 - graves * 25 - leves * 8)
        if duplicado:
            resultado_control = EvaluacionCalidad.Resultado.DUPLICADO_CONFIRMADO
            estado_documento = Documento.Estado.DUPLICADO_CONFIRMADO
        elif graves:
            resultado_control = EvaluacionCalidad.Resultado.ALERTA_GRAVE
            estado_documento = Documento.Estado.OBSERVADO
        elif leves:
            resultado_control = EvaluacionCalidad.Resultado.ALERTA_LEVE
            estado_documento = Documento.Estado.PENDIENTE_REVISION_RAPIDA
        else:
            resultado_control = EvaluacionCalidad.Resultado.SIN_ALERTAS_GRAVES
            estado_documento = Documento.Estado.PENDIENTE_APROBACION

        with transaction.atomic():
            documento = Documento.objects.select_for_update().get(pk=documento_id)
            evaluacion = EvaluacionCalidad.objects.select_for_update().get(documento=documento)
            evaluacion.alertas.all().delete()
            evaluacion.coincidencias.all().delete()
            CoincidenciaDocumento.objects.bulk_create([
                CoincidenciaDocumento(
                    evaluacion=evaluacion,
                    documento_coincidente=item.documento,
                    tipo=item.tipo,
                    similitud_titulo=Decimal(str(item.similitud_titulo)),
                    similitud_contenido=Decimal(str(item.similitud_contenido)),
                    misma_fecha=item.misma_fecha,
                    mismo_identificador=item.mismo_identificador,
                    detalles=item.detalles,
                )
                for item in coincidencias
            ])
            AlertaCalidad.objects.bulk_create([
                AlertaCalidad(
                    evaluacion=evaluacion,
                    codigo=item.codigo,
                    titulo=item.titulo,
                    descripcion=item.descripcion,
                    severidad=item.severidad,
                    documento_relacionado=item.documento_relacionado,
                    evidencia=item.evidencia,
                )
                for item in alertas
            ])
            evaluacion.estado = EvaluacionCalidad.Estado.COMPLETADA
            evaluacion.resultado = resultado_control
            evaluacion.documento_coincidente = duplicado
            evaluacion.hash_contenido = _hash_contenido(texto)
            evaluacion.puntuacion_calidad = Decimal(str(puntuacion))
            evaluacion.total_alertas = len(alertas)
            evaluacion.alertas_leves = leves
            evaluacion.alertas_graves = graves
            evaluacion.finalizado_at = timezone.now()
            evaluacion.duracion_ms = int((time.monotonic() - inicio) * 1000)
            evaluacion.metricas = {
                'caracteres_texto': len(texto),
                'coincidencias': len(coincidencias),
                'confianza_extraccion': float(propuesta.confianza_global or 0),
                'confianza_ocr': float(resultado.confianza_ocr) if resultado.confianza_ocr is not None else None,
            }
            evaluacion.save()
            documento.documento_canonico = duplicado
            documento.estado = estado_documento
            documento.save(update_fields=('documento_canonico', 'estado', 'updated_at'))
            accion = (
                HistorialDocumento.Accion.DUPLICADO_DETECTADO
                if duplicado else HistorialDocumento.Accion.CALIDAD_COMPLETADA
            )
            registrar_historial(
                documento,
                accion,
                estado_anterior=Documento.Estado.CONTROL_CALIDAD,
                estado_nuevo=documento.estado,
                descripcion=(
                    f'Control de calidad completado: {graves} alertas graves, '
                    f'{leves} leves, puntuación {puntuacion}%.'
                ),
            )
        return evaluacion
    except Exception as exc:
        error = exc if isinstance(exc, ErrorCalidad) else ErrorCalidad(
            'ERROR_INTERNO',
            'Ocurrió un error interno durante el control de calidad.',
        )
        _marcar_error(documento_id, error, inicio)
        raise error from exc
