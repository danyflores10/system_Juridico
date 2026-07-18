"""API REST del Módulo 2 — Modificador jurídico."""
import logging

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import LeyOriginal, LeyResultado, ModificacionDocumento
from .services.exportador import generar_docx, generar_pdf
from .services.ingesta import ingestar_leyes, ingestar_modificaciones
from .services.motor_db import procesar_todas_pendientes
from .services.vinculador import (
    reintentar_escaneo_vinculacion,
    vincular_modificacion,
)

logger = logging.getLogger(__name__)


# ─── Serialización ────────────────────────────────────────────────────────────

def _ley_dict(ley: LeyOriginal) -> dict:
    return {
        'id': ley.id,
        'codigo': ley.codigo_ley,
        'titulo': ley.titulo,
        'archivo': ley.archivo_origen,
        'estado': ley.estado,
        'estado_label': ley.get_estado_display(),
        'estado_proceso': ley.estado_proceso,
        'estado_proceso_label': ley.get_estado_proceso_display(),
        'fecha_carga': ley.fecha_carga.isoformat(),
        'versiones': ley.resultados.filter(activo=True).count(),
    }


def _mod_dict(mod: ModificacionDocumento) -> dict:
    return {
        'id': mod.id,
        'archivo': mod.archivo_origen,
        'codigo_detectado': mod.codigo_ley_detectado or '',
        'palabras_clave': mod.palabras_clave_detectadas or '',
        'vinculada': mod.ley_original_id is not None,
        'ley_id': mod.ley_original_id,
        'ley_codigo': mod.ley_original.codigo_ley if mod.ley_original else None,
        'ley_titulo': mod.ley_original.titulo if mod.ley_original else None,
        'procesado': mod.procesado,
        'estado': mod.estado_vinculacion,
        'estado_label': mod.get_estado_vinculacion_display(),
        'fecha_carga': mod.fecha_carga.isoformat(),
    }


def _resultado_dict(res: LeyResultado, incluir_contenido: bool = False) -> dict:
    preinforme = res.preinforme or {}
    data = {
        'id': res.id,
        'ley_id': res.ley_original_id,
        'ley_codigo': res.ley_original.codigo_ley,
        'ley_titulo': res.ley_original.titulo,
        'ley_estado': res.ley_original.estado,
        'version': res.version,
        'fecha': res.fecha_modificacion.isoformat(),
        'es_version_final': res.es_version_final,
        'archivo_docx': res.archivo_docx,
        'archivo_pdf': res.archivo_pdf,
        'total_cambios': preinforme.get('total_cambios', 0),
        'resumen_ejecutivo': preinforme.get('resumen_ejecutivo', {}),
        'alertas_criticas': len(preinforme.get('errores_detectados', [])),
        'advertencias': len(preinforme.get('advertencias', [])),
        'norma_modificatoria': preinforme.get('norma_modificatoria', {}),
        'archivo_modificatorio': preinforme.get('archivo_modificatorio', ''),
    }
    if incluir_contenido:
        data['contenido_final'] = res.contenido_final
        data['preinforme'] = preinforme
    return data


def _stats() -> dict:
    mods = ModificacionDocumento.objects.all()
    resultados = LeyResultado.objects.filter(activo=True)
    alertas = sum(
        len((r.preinforme or {}).get('errores_detectados', [])) for r in resultados
    )
    return {
        'leyes_activas': LeyOriginal.objects.filter(
            estado=LeyOriginal.Estado.ACTIVO
        ).count(),
        'leyes_abrogadas': LeyOriginal.objects.filter(
            estado=LeyOriginal.Estado.ABROGADA
        ).count(),
        'mods_pendientes': mods.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PENDIENTE,
            procesado=False,
        ).count(),
        'mods_vinculadas': mods.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.VINCULADA,
            procesado=False,
        ).count(),
        'mods_procesadas': mods.filter(procesado=True).count(),
        'resultados': resultados.count(),
        'alertas_criticas': alertas,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@api_view(['GET'])
def resumen(request):
    return Response({'stats': _stats()})


@api_view(['GET'])
def listar_leyes(request):
    leyes = LeyOriginal.objects.prefetch_related('resultados').order_by('codigo_ley')
    return Response({'leyes': [_ley_dict(ley) for ley in leyes], 'stats': _stats()})


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def cargar_leyes(request):
    archivos = request.FILES.getlist('archivos')
    if not archivos:
        return Response(
            {'detail': 'No se recibieron archivos.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    resultado = ingestar_leyes(archivos)
    mensaje = f'{len(resultado.creadas)} norma(s) registrada(s).'
    if resultado.omitidos:
        mensaje += f' {len(resultado.omitidos)} omitida(s).'
    return Response(
        {
            'mensaje': mensaje,
            'leyes': [_ley_dict(ley) for ley in resultado.creadas],
            'omitidos': resultado.omitidos,
            'stats': _stats(),
        }
    )


@api_view(['POST'])
def desactivar_ley(request, pk: int):
    ley = get_object_or_404(LeyOriginal, pk=pk)
    if ley.estado == LeyOriginal.Estado.ABROGADA:
        return Response(
            {'detail': 'Esta norma está abrogada y no puede desactivarse manualmente.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    ley.marcar_inactiva()
    return Response(
        {'mensaje': f'Ley {ley.codigo_ley} desactivada.', 'stats': _stats()}
    )


@api_view(['GET'])
def listar_modificatorias(request):
    mods = ModificacionDocumento.objects.select_related('ley_original').order_by(
        '-fecha_carga'
    )
    return Response(
        {'modificatorias': [_mod_dict(m) for m in mods], 'stats': _stats()}
    )


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def cargar_modificatorias(request):
    archivos = request.FILES.getlist('archivos')
    if not archivos:
        return Response(
            {'detail': 'No se recibieron archivos modificatorios.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    resultado = ingestar_modificaciones(archivos)
    vinculadas = sum(
        1
        for m in resultado.creadas
        if m.estado_vinculacion == ModificacionDocumento.EstadoVinculacion.VINCULADA
    )
    mensaje = (
        f'{len(resultado.creadas)} documento(s) cargado(s), '
        f'{vinculadas} vinculado(s) automáticamente.'
    )
    if resultado.duplicados:
        mensaje += (
            f' {len(resultado.duplicados)} duplicado(s) rechazado(s): '
            'esa norma modificatoria ya fue procesada.'
        )
    if resultado.omitidos:
        mensaje += f' {len(resultado.omitidos)} omitido(s).'
    return Response(
        {
            'mensaje': mensaje,
            'modificatorias': [_mod_dict(m) for m in resultado.creadas],
            'duplicados': resultado.duplicados,
            'omitidos': resultado.omitidos,
            'stats': _stats(),
        }
    )


@api_view(['POST'])
def reintentar_vinculacion(request, pk: int):
    mod = get_object_or_404(ModificacionDocumento, pk=pk, procesado=False)
    ok, mensaje, info = reintentar_escaneo_vinculacion(mod)
    mod.refresh_from_db()
    return Response(
        {
            'ok': ok,
            'mensaje': mensaje,
            'modificatoria': _mod_dict(mod),
            'diagnostico': info,
            'stats': _stats(),
        }
    )


@api_view(['POST'])
@parser_classes([JSONParser])
def vincular_manual(request, pk: int):
    ley_id = request.data.get('ley_id')
    if not ley_id:
        return Response(
            {'detail': 'Seleccione una norma original.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    mod = get_object_or_404(ModificacionDocumento, pk=pk, procesado=False)
    ok, mensaje = vincular_modificacion(mod, ley_id=int(ley_id))
    mod.refresh_from_db()
    return Response(
        {'ok': ok, 'mensaje': mensaje, 'modificatoria': _mod_dict(mod), 'stats': _stats()},
        status=status.HTTP_200_OK if ok else status.HTTP_400_BAD_REQUEST,
    )


@api_view(['POST'])
def procesar(request):
    resultado = procesar_todas_pendientes()
    n = resultado['procesados']
    if n == 0 and resultado['sin_vincular'] > 0:
        mensaje = (
            f"No se procesó ningún archivo: {resultado['sin_vincular']} "
            'modificatorio(s) sin vincular. Use «Reintentar» o «Vincular».'
        )
    elif n == 0 and resultado.get('listos_para_motor', 0) > 0:
        mensaje = (
            'Documentos vinculados sin cambios detectables. Revise las palabras '
            'clave (SE MODIFICA, SE INCORPORA, DEROGACIÓN…).'
        )
    elif n == 0:
        mensaje = 'No hay modificatorios vinculados listos para procesar.'
    else:
        mensaje = f'Se generaron {n} norma(s) consolidada(s) en Normativa actualizada.'
        if resultado['omitidos']:
            mensaje += f" {resultado['omitidos']} omitida(s)."
    return Response(
        {
            'ok': n > 0,
            'mensaje': mensaje,
            'procesados': n,
            'vinculadas_auto': resultado['vinculadas_auto'],
            'sin_vincular': resultado['sin_vincular'],
            'errores': resultado['errores'][:5],
            'resultados': [_resultado_dict(r) for r in resultado['generados']],
            'stats': _stats(),
        }
    )


@api_view(['GET'])
def listar_resultados(request):
    resultados = (
        LeyResultado.objects.filter(activo=True)
        .select_related('ley_original')
        .order_by('-fecha_modificacion')
    )
    return Response(
        {'resultados': [_resultado_dict(r) for r in resultados], 'stats': _stats()}
    )


@api_view(['GET'])
def detalle_resultado(request, pk: int):
    res = get_object_or_404(
        LeyResultado.objects.select_related('ley_original'), pk=pk, activo=True
    )
    return Response({'resultado': _resultado_dict(res, incluir_contenido=True)})


@api_view(['POST'])
def desactivar_resultado(request, pk: int):
    res = get_object_or_404(LeyResultado, pk=pk)
    res.activo = False
    res.save(update_fields=['activo'])
    return Response(
        {'mensaje': f'Resultado v{res.version} desactivado.', 'stats': _stats()}
    )


@api_view(['GET'])
def descargar_resultado(request, pk: int):
    res = get_object_or_404(
        LeyResultado.objects.select_related('ley_original'), pk=pk
    )
    formato = request.query_params.get('formato', 'docx').lower()
    ley = res.ley_original
    try:
        if formato == 'pdf':
            datos = generar_pdf(res.contenido_final, ley.titulo, ley.codigo_ley)
            content_type = 'application/pdf'
            nombre = f'Ley_{ley.codigo_ley}_v{res.version}.pdf'
        else:
            datos = generar_docx(res.contenido_final, ley.titulo, ley.codigo_ley)
            content_type = (
                'application/vnd.openxmlformats-officedocument'
                '.wordprocessingml.document'
            )
            nombre = f'Ley_{ley.codigo_ley}_v{res.version}.docx'
    except Exception as e:  # noqa: BLE001 — error reportado al cliente
        logger.exception('Error generando documento')
        return Response(
            {'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    response = HttpResponse(datos, content_type=content_type)
    response['Content-Disposition'] = f'attachment; filename="{nombre}"'
    return response
