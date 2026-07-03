from celery import shared_task
from celery.utils.log import get_task_logger
from django.db import transaction

from .extraction import ErrorExtraccion, extraer_datos_juridicos
from .conversion import (
    ErrorConversion,
    convertir_documento_final,
    marcar_error_conversion,
)
from .models import (
    Documento,
    EvaluacionCalidad,
    PropuestaExtraccion,
    ResultadoProcesamiento,
    ResultadoConversion,
)
from .processing import ErrorProcesamiento, procesar_documento
from .quality import ErrorCalidad, evaluar_calidad_documento


logger = get_task_logger(__name__)


@shared_task(bind=True, name='normativa.procesar_documento')
def procesar_documento_task(self, documento_id):
    ResultadoProcesamiento.objects.filter(documento_id=documento_id).update(
        tarea_id=self.request.id or '',
    )
    try:
        resultado = procesar_documento(documento_id)
    except ErrorProcesamiento as exc:
        raise RuntimeError(f'{exc.codigo}: {exc.mensaje}') from exc
    try:
        encolar_extraccion(resultado.documento)
    except Exception:
        # El procesamiento técnico ya terminó correctamente. Si Redis no
        # permite encadenar, la extracción podrá iniciarse desde su endpoint.
        logger.exception(
            'No se pudo encadenar la extracción del documento %s.',
            documento_id,
        )
    return {
        'documento_id': documento_id,
        'estado': resultado.estado,
        'paginas': resultado.numero_paginas,
    }


def encolar_procesamiento(documento):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento.pk)
        if documento.estado not in {
            Documento.Estado.PENDIENTE_PROCESAMIENTO,
            Documento.Estado.ERROR,
        }:
            raise ValueError(
                'El documento no está disponible para procesamiento.'
            )
        resultado, _ = ResultadoProcesamiento.objects.get_or_create(
            documento=documento,
        )
        if resultado.estado in {
            ResultadoProcesamiento.Estado.EN_COLA,
            ResultadoProcesamiento.Estado.PROCESANDO,
        } and resultado.tarea_id:
            return resultado
        resultado.estado = ResultadoProcesamiento.Estado.EN_COLA
        resultado.tarea_id = ''
        resultado.error_codigo = ''
        resultado.error_mensaje = ''
        resultado.save()

    tarea = procesar_documento_task.delay(documento.pk)
    ResultadoProcesamiento.objects.filter(
        pk=resultado.pk,
        estado=ResultadoProcesamiento.Estado.EN_COLA,
    ).update(tarea_id=tarea.id or '')
    resultado.refresh_from_db()
    return resultado


@shared_task(bind=True, name='normativa.extraer_datos_juridicos')
def extraer_datos_juridicos_task(self, documento_id):
    PropuestaExtraccion.objects.filter(documento_id=documento_id).update(
        tarea_id=self.request.id or '',
    )
    try:
        propuesta = extraer_datos_juridicos(documento_id)
    except ErrorExtraccion as exc:
        raise RuntimeError(f'{exc.codigo}: {exc.mensaje}') from exc
    try:
        encolar_control_calidad(propuesta.documento)
    except Exception:
        logger.exception(
            'No se pudo encadenar el control de calidad del documento %s.',
            documento_id,
        )
    return {
        'documento_id': documento_id,
        'estado': propuesta.estado,
        'confianza_global': str(propuesta.confianza_global or ''),
    }


def encolar_extraccion(documento):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento.pk)
        if documento.estado not in {
            Documento.Estado.PENDIENTE_EXTRACCION,
            Documento.Estado.PENDIENTE_REVISION,
        }:
            raise ValueError('El documento no está disponible para extracción jurídica.')
        propuesta, _ = PropuestaExtraccion.objects.get_or_create(documento=documento)
        if propuesta.estado in {
            PropuestaExtraccion.Estado.EN_COLA,
            PropuestaExtraccion.Estado.EXTRAYENDO,
        } and propuesta.tarea_id:
            return propuesta
        propuesta.estado = PropuestaExtraccion.Estado.EN_COLA
        propuesta.tarea_id = ''
        propuesta.error_codigo = ''
        propuesta.error_mensaje = ''
        propuesta.save()

    tarea = extraer_datos_juridicos_task.delay(documento.pk)
    PropuestaExtraccion.objects.filter(
        pk=propuesta.pk,
        estado=PropuestaExtraccion.Estado.EN_COLA,
    ).update(tarea_id=tarea.id or '')
    propuesta.refresh_from_db()
    return propuesta


@shared_task(bind=True, name='normativa.evaluar_calidad_documento')
def evaluar_calidad_documento_task(self, documento_id):
    EvaluacionCalidad.objects.filter(documento_id=documento_id).update(
        tarea_id=self.request.id or '',
    )
    try:
        evaluacion = evaluar_calidad_documento(documento_id)
    except ErrorCalidad as exc:
        raise RuntimeError(f'{exc.codigo}: {exc.mensaje}') from exc
    return {
        'documento_id': documento_id,
        'estado': evaluacion.estado,
        'resultado': evaluacion.resultado,
        'alertas': evaluacion.total_alertas,
    }


def encolar_control_calidad(documento):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento.pk)
        if documento.estado not in {
            Documento.Estado.PENDIENTE_REVISION,
            Documento.Estado.PENDIENTE_REVISION_RAPIDA,
            Documento.Estado.OBSERVADO,
            Documento.Estado.LISTO_PARA_CONVERSION,
            Documento.Estado.PENDIENTE_APROBACION,
        }:
            raise ValueError('El documento no está disponible para control de calidad.')
        evaluacion, _ = EvaluacionCalidad.objects.get_or_create(documento=documento)
        if evaluacion.estado in {
            EvaluacionCalidad.Estado.EN_COLA,
            EvaluacionCalidad.Estado.ANALIZANDO,
        } and evaluacion.tarea_id:
            return evaluacion
        evaluacion.estado = EvaluacionCalidad.Estado.EN_COLA
        evaluacion.tarea_id = ''
        evaluacion.error_codigo = ''
        evaluacion.error_mensaje = ''
        evaluacion.save()

    tarea = evaluar_calidad_documento_task.delay(documento.pk)
    EvaluacionCalidad.objects.filter(
        pk=evaluacion.pk,
        estado=EvaluacionCalidad.Estado.EN_COLA,
    ).update(tarea_id=tarea.id or '')
    evaluacion.refresh_from_db()
    return evaluacion


@shared_task(bind=True, name='normativa.convertir_documento_final')
def convertir_documento_final_task(self, documento_id):
    ResultadoConversion.objects.filter(documento_id=documento_id).update(
        tarea_id=self.request.id or '',
    )
    try:
        resultado = convertir_documento_final(documento_id)
    except ErrorConversion as exc:
        marcar_error_conversion(documento_id, exc)
        raise RuntimeError(f'{exc.codigo}: {exc.mensaje}') from exc
    return {
        'documento_id': documento_id,
        'estado': resultado.estado,
        'archivo': resultado.ruta_relativa,
    }


def encolar_conversion(documento):
    with transaction.atomic():
        documento = Documento.objects.select_for_update().get(pk=documento.pk)
        if documento.estado not in {
            Documento.Estado.LISTO_PARA_CONVERSION,
            Documento.Estado.ERROR_CONVERSION,
        }:
            raise ValueError('El documento no está disponible para conversión final.')
        resultado, _ = ResultadoConversion.objects.get_or_create(documento=documento)
        if resultado.estado == ResultadoConversion.Estado.COMPLETADA and resultado.archivo:
            return resultado
        if resultado.estado in {
            ResultadoConversion.Estado.EN_COLA,
            ResultadoConversion.Estado.CONVIRTIENDO,
        } and resultado.tarea_id:
            return resultado
        resultado.estado = ResultadoConversion.Estado.EN_COLA
        resultado.tarea_id = ''
        resultado.error_codigo = ''
        resultado.error_mensaje = ''
        resultado.save()

    tarea = convertir_documento_final_task.delay(documento.pk)
    ResultadoConversion.objects.filter(
        pk=resultado.pk,
        estado=ResultadoConversion.Estado.EN_COLA,
    ).update(tarea_id=tarea.id or '')
    resultado.refresh_from_db()
    return resultado
