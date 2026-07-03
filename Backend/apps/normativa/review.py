import logging

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework import serializers

from .models import (
    AlertaCalidad,
    CambioRevisionJuridica,
    DecisionAlertaRevision,
    Documento,
    EvaluacionCalidad,
    EvidenciaExtraccion,
    HistorialDocumento,
    PropuestaExtraccion,
    RevisionJuridica,
)
from .services import registrar_historial


logger = logging.getLogger(__name__)


REVIEWABLE_STATES = {
    Documento.Estado.PENDIENTE_APROBACION,
    Documento.Estado.PENDIENTE_REVISION_RAPIDA,
    Documento.Estado.OBSERVADO,
    Documento.Estado.LISTO_PARA_CONVERSION,
    Documento.Estado.ERROR_CONVERSION,
}

FIELD_NAMES = (
    'tipo_norma',
    'efecto_normativo',
    'materia',
    'entidad_emisora',
    'numero',
    'fecha_emision',
    'titulo',
    'objeto',
    'observaciones',
)

PROPOSAL_FIELDS = {
    'tipo_norma': 'tipo_norma_propuesto',
    'efecto_normativo': 'efecto_normativo_propuesto',
    'materia': 'materia_propuesta',
    'entidad_emisora': 'entidad_emisora_propuesta',
    'numero': 'numero_propuesto',
    'fecha_emision': 'fecha_emision_propuesta',
    'titulo': 'titulo_propuesto',
    'objeto': 'objeto_propuesto',
}

EVIDENCE_FIELDS = {
    'tipo_norma': EvidenciaExtraccion.Campo.TIPO_NORMA,
    'efecto_normativo': EvidenciaExtraccion.Campo.EFECTO_NORMATIVO,
    'materia': EvidenciaExtraccion.Campo.MATERIA,
    'entidad_emisora': EvidenciaExtraccion.Campo.ENTIDAD_EMISORA,
    'numero': EvidenciaExtraccion.Campo.NUMERO,
    'fecha_emision': EvidenciaExtraccion.Campo.FECHA_EMISION,
    'titulo': EvidenciaExtraccion.Campo.TITULO,
    'objeto': EvidenciaExtraccion.Campo.OBJETO,
}


def _user(user):
    return user if getattr(user, 'is_authenticated', False) else None


def _value(value):
    if value is None:
        return ''
    if hasattr(value, 'pk'):
        return str(value.pk)
    if hasattr(value, 'isoformat'):
        return value.isoformat()
    return str(value)


def snapshot_ficha(documento):
    return {field: _value(getattr(documento, field)) for field in FIELD_NAMES}


def _validate_document(documento):
    missing = []
    for field in ('tipo_norma', 'efecto_normativo', 'materia', 'entidad_emisora'):
        if not getattr(documento, f'{field}_id'):
            missing.append(field)
    if documento.tipo_norma_id:
        if documento.tipo_norma.requiere_numero and not documento.numero.strip():
            missing.append('numero')
        if documento.tipo_norma.requiere_fecha and not documento.fecha_emision:
            missing.append('fecha_emision')
    if not documento.titulo.strip():
        missing.append('titulo')
    if not documento.objeto.strip():
        missing.append('objeto')
    if missing:
        raise serializers.ValidationError({
            'detail': 'Complete todos los datos jurídicos obligatorios.',
            'campos_faltantes': missing,
        })


def _active_revision(documento, user=None):
    revision = documento.revisiones_juridicas.filter(
        estado=RevisionJuridica.Estado.EN_CURSO,
    ).first()
    if revision:
        return revision
    last_number = documento.revisiones_juridicas.aggregate(
        value=Max('numero_revision'),
    )['value'] or 0
    return RevisionJuridica.objects.create(
        documento=documento,
        numero_revision=last_number + 1,
        revisado_por=_user(user),
        ficha_anterior=snapshot_ficha(documento),
    )


@transaction.atomic
def iniciar_revision(documento_id, user=None):
    documento = Documento.objects.select_for_update().get(pk=documento_id)
    if documento.estado not in REVIEWABLE_STATES:
        raise serializers.ValidationError(
            'El documento no está disponible para revisión jurídica.'
        )
    try:
        calidad = documento.evaluacion_calidad
        propuesta = documento.propuesta_extraccion
    except (EvaluacionCalidad.DoesNotExist, PropuestaExtraccion.DoesNotExist) as exc:
        raise serializers.ValidationError(
            'El documento necesita extracción y control de calidad completos.'
        ) from exc
    if calidad.estado != EvaluacionCalidad.Estado.COMPLETADA:
        raise serializers.ValidationError('El control de calidad todavía no terminó.')
    if propuesta.estado != PropuestaExtraccion.Estado.COMPLETADA:
        raise serializers.ValidationError('La propuesta jurídica todavía no terminó.')
    revision = _active_revision(documento, user)
    if not revision.revisado_por_id and _user(user):
        revision.revisado_por = user
        revision.save(update_fields=('revisado_por', 'updated_at'))
    if not documento.historial.filter(
        accion=HistorialDocumento.Accion.REVISION_INICIADA,
        descripcion__contains=f'#{revision.numero_revision}',
    ).exists():
        registrar_historial(
            documento,
            HistorialDocumento.Accion.REVISION_INICIADA,
            user,
            estado_anterior=documento.estado,
            estado_nuevo=documento.estado,
            descripcion=f'Revisión jurídica #{revision.numero_revision} iniciada.',
        )
    return revision


def _evidence(propuesta, field):
    evidence_field = EVIDENCE_FIELDS.get(field)
    if not evidence_field:
        return None
    return propuesta.evidencias.filter(campo=evidence_field).first()


def _proposed_value(propuesta, field):
    proposal_field = PROPOSAL_FIELDS.get(field)
    return _value(getattr(propuesta, proposal_field, '')) if proposal_field else ''


def _encolar_conversion_aprobada(documento_id):
    """Continúa el flujo sin revertir la aprobación si Celery no está disponible."""
    try:
        from .tasks import encolar_conversion

        documento = Documento.objects.get(pk=documento_id)
        encolar_conversion(documento)
    except Exception:
        logger.exception(
            'No se pudo encolar automáticamente la conversión del documento %s.',
            documento_id,
        )


@transaction.atomic
def aprobar_revision(documento_id, data, alert_decisions, user=None):
    documento = Documento.objects.select_for_update(of=('self',)).select_related(
        'tipo_norma', 'efecto_normativo', 'materia', 'entidad_emisora',
    ).get(pk=documento_id)
    if documento.estado not in REVIEWABLE_STATES:
        raise serializers.ValidationError(
            'El documento no está disponible para aprobación.'
        )
    revision = iniciar_revision(documento.pk, user)
    propuesta = PropuestaExtraccion.objects.prefetch_related('evidencias').get(
        documento=documento,
    )
    evaluacion = EvaluacionCalidad.objects.select_for_update().get(
        documento=documento,
    )
    active_alerts = {
        alert.pk: alert
        for alert in evaluacion.alertas.select_for_update().filter(
            estado=AlertaCalidad.Estado.ACTIVA,
        )
    }
    decisions_by_id = {item['alerta_id']: item for item in alert_decisions}
    unknown_decisions = sorted(set(decisions_by_id) - set(active_alerts))
    if unknown_decisions:
        raise serializers.ValidationError({
            'decisiones_alertas': (
                'Una o más alertas no pertenecen al documento o ya fueron revisadas.'
            ),
            'alertas_invalidas': unknown_decisions,
        })
    missing_decisions = sorted(set(active_alerts) - set(decisions_by_id))
    if missing_decisions:
        raise serializers.ValidationError({
            'detail': 'Debe revisar todas las alertas activas.',
            'alertas_pendientes': missing_decisions,
        })

    previous = snapshot_ficha(documento)
    for field in FIELD_NAMES:
        if field in data:
            setattr(documento, field, data[field])
    _validate_document(documento)

    for alert_id, alert in active_alerts.items():
        item = decisions_by_id[alert_id]
        justification = item.get('justificacion', '').strip()
        if item['decision'] == DecisionAlertaRevision.Decision.IGNORADA and not justification:
            raise serializers.ValidationError({
                'decisiones_alertas': (
                    f'La alerta {alert_id} necesita una justificación para ignorarse.'
                )
            })
        alert.estado = (
            AlertaCalidad.Estado.RESUELTA
            if item['decision'] == DecisionAlertaRevision.Decision.RESUELTA
            else AlertaCalidad.Estado.IGNORADA
        )
        alert.nota_resolucion = justification
        alert.resuelta_por = _user(user)
        alert.resuelta_at = timezone.now()
        alert.save(update_fields=(
            'estado', 'nota_resolucion', 'resuelta_por', 'resuelta_at',
        ))
        DecisionAlertaRevision.objects.update_or_create(
            revision=revision,
            alerta=alert,
            defaults={
                'decision': item['decision'],
                'justificacion': justification,
            },
        )
        registrar_historial(
            documento,
            HistorialDocumento.Accion.ALERTA_REVISADA,
            user,
            estado_anterior=documento.estado,
            estado_nuevo=documento.estado,
            descripcion=(
                f'Alerta {alert.codigo}: {alert.get_estado_display()}. '
                f'{justification}'
            ).strip(),
        )

    # Las alertas se conservan como evidencia de auditoría, pero después de
    # una decisión jurídica ya no deben bloquear la conversión.
    evaluacion.resultado = EvaluacionCalidad.Resultado.SIN_ALERTAS_GRAVES
    evaluacion.save(update_fields=('resultado', 'updated_at'))

    document_previous_state = documento.estado
    documento.estado = Documento.Estado.LISTO_PARA_CONVERSION
    documento.save()
    approved = snapshot_ficha(documento)
    for field in FIELD_NAMES:
        evidence = _evidence(propuesta, field)
        proposed = _proposed_value(propuesta, field)
        new_value = approved[field]
        origin = (
            CambioRevisionJuridica.OrigenValor.PROPUESTA
            if field in PROPOSAL_FIELDS and new_value == proposed
            else CambioRevisionJuridica.OrigenValor.CORRECCION_MANUAL
        )
        if previous[field] == new_value and origin != CambioRevisionJuridica.OrigenValor.PROPUESTA:
            origin = CambioRevisionJuridica.OrigenValor.SIN_CAMBIO
        CambioRevisionJuridica.objects.update_or_create(
            revision=revision,
            campo=field,
            defaults={
                'valor_anterior': previous[field],
                'valor_nuevo': new_value,
                'origen_valor': origin,
                'confianza_propuesta': evidence.confianza if evidence else None,
                'evidencia': ({
                    'pagina': evidence.numero_pagina,
                    'fragmento': evidence.fragmento,
                    'regla': evidence.regla_aplicada,
                } if evidence else {}),
            },
        )
        if previous[field] != new_value:
            registrar_historial(
                documento,
                HistorialDocumento.Accion.CAMPO_JURIDICO_EDITADO,
                user,
                estado_anterior=document_previous_state,
                estado_nuevo=documento.estado,
                descripcion=f'{field}: "{previous[field]}" → "{new_value}".',
            )

    revision.estado = RevisionJuridica.Estado.APROBADA
    revision.revisado_por = _user(user)
    revision.observaciones = data.get('observaciones_revision', '').strip()
    revision.ficha_aprobada = approved
    revision.finalizada_at = timezone.now()
    revision.save()
    registrar_historial(
        documento,
        HistorialDocumento.Accion.REVISION_APROBADA,
        user,
        estado_anterior=document_previous_state,
        estado_nuevo=documento.estado,
        descripcion=(
            f'Revisión jurídica #{revision.numero_revision} aprobada. '
            'Documento habilitado para conversión.'
        ),
    )
    transaction.on_commit(
        lambda documento_id=documento.pk: _encolar_conversion_aprobada(documento_id)
    )
    return revision


@transaction.atomic
def devolver_revision(documento_id, motivo, user=None):
    documento = Documento.objects.select_for_update().get(pk=documento_id)
    if documento.estado not in REVIEWABLE_STATES:
        raise serializers.ValidationError(
            'El documento no está disponible para revisión.'
        )
    revision = _active_revision(documento, user)
    previous_state = documento.estado
    revision.estado = RevisionJuridica.Estado.DEVUELTA
    revision.revisado_por = _user(user)
    revision.motivo_devolucion = motivo.strip()
    revision.finalizada_at = timezone.now()
    revision.save()
    documento.estado = Documento.Estado.OBSERVADO
    documento.save(update_fields=('estado', 'updated_at'))
    registrar_historial(
        documento,
        HistorialDocumento.Accion.REVISION_DEVUELTA,
        user,
        estado_anterior=previous_state,
        estado_nuevo=documento.estado,
        descripcion=f'Revisión devuelta: {revision.motivo_devolucion}',
    )
    return revision
