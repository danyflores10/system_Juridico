import json
import logging

from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_http_methods

from .models import LeyOriginal, LeyResultado, ModificacionDocumento
from .services.dashboard_analytics import construir_api_dashboard, construir_dashboard_context
from .services.exportador import generar_docx, generar_pdf
from .services.html_formatter import asegurar_html
from .services.ingesta import ingestar_leyes, ingestar_modificaciones
from .services.motor_db import procesar_todas_pendientes
from .services.vinculador import (
    reintentar_escaneo_vinculacion,
    vincular_modificacion,
    vincular_modificaciones_pendientes,
)

logger = logging.getLogger(__name__)


def _leyes_activas():
    return LeyOriginal.objects.filter(estado=LeyOriginal.Estado.ACTIVO).order_by(
        "codigo_ley"
    )


def _leyes_inactivas():
    return LeyOriginal.objects.exclude(estado=LeyOriginal.Estado.ACTIVO).order_by(
        "-fecha_carga"
    )[:30]


def _modificaciones_queryset():
    return ModificacionDocumento.objects.select_related("ley_original").order_by(
        "-fecha_carga"
    )


def _resultados_activos():
    return (
        LeyResultado.objects.filter(activo=True)
        .select_related("ley_original")
        .order_by("-fecha_modificacion")
    )


def _serializar_modificacion(mod: ModificacionDocumento) -> dict:
    return {
        "id": mod.id,
        "archivo": mod.archivo_origen,
        "codigo": mod.codigo_ley_detectado or "",
        "claves": mod.palabras_clave_detectadas or "",
        "vinculada": mod.ley_original_id is not None,
        "ley": mod.ley_original.codigo_ley if mod.ley_original else None,
        "ley_id": mod.ley_original_id,
        "procesado": mod.procesado,
        "estado": mod.estado_vinculacion,
        "estado_label": mod.get_estado_vinculacion_display(),
    }


def _stats_panel():
    mods_qs = _modificaciones_queryset()
    return {
        "leyes": _leyes_activas().count(),
        "leyes_inactivas": LeyOriginal.objects.exclude(
            estado=LeyOriginal.Estado.ACTIVO
        ).count(),
        "mods_pendientes": mods_qs.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PENDIENTE,
            procesado=False,
        ).count(),
        "mods_vinculadas": mods_qs.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.VINCULADA,
            procesado=False,
        ).count(),
        "mods_procesadas": mods_qs.filter(
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PROCESADO
        ).count(),
        "resultados": _resultados_activos().count(),
    }


@require_http_methods(["GET"])
def panel(request):
    etapa = request.GET.get("etapa", "1")
    leyes = _leyes_activas()
    stats = _stats_panel()
    return render(
        request,
        "leyes/panel.html",
        {
            "etapa": etapa,
            "leyes": leyes,
            "leyes_para_select": _leyes_para_select(),
            "leyes_inactivas": _leyes_inactivas() if etapa == "1" else [],
            "modificaciones": _modificaciones_queryset()[:50],
            "resultados": _resultados_activos()[:50],
            "stats": stats,
        },
    )


@require_http_methods(["GET"])
def api_estado_panel(request):
    """JSON para actualizar UI sin recargar página."""
    mods = [_serializar_modificacion(m) for m in _modificaciones_queryset()[:50]]
    leyes = _leyes_para_select()
    return JsonResponse(
        {
            "ok": True,
            "stats": _stats_panel(),
            "modificaciones": mods,
            "leyes": leyes,
        }
    )


def _leyes_para_select():
    return [
        {
            "id": l.id,
            "codigo": l.codigo_ley,
            "titulo": l.titulo,
            "label": f"Ley {l.codigo_ley} — {l.titulo[:70]}",
        }
        for l in _leyes_activas()
    ]


@require_http_methods(["GET"])
def api_listar_leyes(request):
    return JsonResponse({"ok": True, "leyes": _leyes_para_select()})


@require_http_methods(["GET"])
def detalle_resultado(request, pk):
    resultado = get_object_or_404(
        LeyResultado.objects.select_related("ley_original"), pk=pk, activo=True
    )
    return render(
        request,
        "leyes/detalle_resultado.html",
        {"resultado": resultado, "etapa": "3"},
    )


@require_http_methods(["POST"])
def cargar_leyes(request):
    archivos = request.FILES.getlist("archivos")
    if not archivos:
        return JsonResponse(
            {"ok": False, "mensaje": "No se recibieron archivos."}, status=400
        )
    try:
        creadas = ingestar_leyes(archivos)
        omitidos = len(archivos) - len(creadas)
        msg = f"{len(creadas)} ley(es) reconocida(s) y registrada(s)."
        if omitidos:
            msg += f" ({omitidos} archivo(s) omitido(s) o sin código detectable)"
        return JsonResponse(
            {
                "ok": True,
                "mensaje": msg,
                "leyes": [
                    {
                        "id": l.id,
                        "codigo": l.codigo_ley,
                        "titulo": l.titulo,
                        "estado": l.get_estado_proceso_display(),
                    }
                    for l in creadas
                ],
                "stats": _stats_panel(),
            }
        )
    except Exception as e:
        logger.exception("Error al cargar leyes")
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)


@require_http_methods(["POST"])
def cargar_modificaciones(request):
    archivos = request.FILES.getlist("archivos")
    if not archivos:
        return JsonResponse(
            {"ok": False, "mensaje": "No se recibieron archivos modificatorios."},
            status=400,
        )
    try:
        creadas = ingestar_modificaciones(archivos)
        vinculadas = sum(
            1
            for m in creadas
            if m.estado_vinculacion
            == ModificacionDocumento.EstadoVinculacion.VINCULADA
        )
        sin_vincular = len(creadas) - vinculadas
        msg = (
            f"{len(creadas)} documento(s) cargado(s). "
            f"{vinculadas} vinculado(s) automáticamente."
        )
        if sin_vincular:
            msg += f" {sin_vincular} requiere(n) vinculación manual o reintento."
        return JsonResponse(
            {
                "ok": True,
                "mensaje": msg,
                "modificaciones": [_serializar_modificacion(m) for m in creadas],
                "stats": _stats_panel(),
                "leyes": _leyes_para_select(),
            }
        )
    except Exception as e:
        logger.exception("Error al cargar modificaciones")
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)


@require_http_methods(["POST"])
def reintentar_vinculacion(request, pk):
    mod = get_object_or_404(ModificacionDocumento, pk=pk, procesado=False)
    try:
        ok, mensaje, info = reintentar_escaneo_vinculacion(mod)
        mod.refresh_from_db()
        return JsonResponse(
            {
                "ok": ok,
                "mensaje": mensaje,
                "modificacion": _serializar_modificacion(mod),
                "stats": _stats_panel(),
                "diagnostico": info,
                "modificaciones": [
                    _serializar_modificacion(m)
                    for m in _modificaciones_queryset()[:50]
                ],
            }
        )
    except Exception as e:
        logger.exception("Error reintentar vinculación")
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)


@require_http_methods(["POST"])
def vincular_manual(request, pk):
    try:
        data = json.loads(request.body) if request.body else {}
        ley_id = data.get("ley_id") or request.POST.get("ley_id")
        if not ley_id:
            return JsonResponse(
                {"ok": False, "mensaje": "Seleccione una ley original."},
                status=400,
            )
        mod = get_object_or_404(ModificacionDocumento, pk=pk, procesado=False)
        ok, mensaje = vincular_modificacion(mod, ley_id=int(ley_id))
        mod.refresh_from_db()
        return JsonResponse(
            {
                "ok": ok,
                "mensaje": mensaje if ok else mensaje,
                "modificacion": _serializar_modificacion(mod),
                "stats": _stats_panel(),
            },
            status=200 if ok else 400,
        )
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "mensaje": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)


@require_http_methods(["POST"])
def procesar_modificaciones(request):
    try:
        vincular_modificaciones_pendientes()
        resultado = procesar_todas_pendientes()
        n = resultado["procesados"]
        v = resultado["vinculadas_auto"]
        sin_v = resultado["sin_vincular"]

        listos = resultado.get("listos_para_motor", 0)
        leyes_disp = ", ".join(
            f"Ley {l.codigo_ley}"
            for l in _leyes_activas()[:10]
        )

        if n == 0 and sin_v > 0:
            mensaje = (
                f"No se procesó ningún archivo: {sin_v} modificatorio(s) sin vincular. "
                f"Leyes cargadas en el sistema: [{leyes_disp or 'ninguna'}]. "
                "Pulse «Reintentar Vinculación» (escaneo profundo del PDF) o «Asignar ▾» (elección manual)."
            )
            return JsonResponse(
                {
                    "ok": False,
                    "mensaje": mensaje,
                    "stats": _stats_panel(),
                    "detalle": resultado,
                    "leyes_disponibles": _leyes_para_select(),
                    "modificaciones": [
                        _serializar_modificacion(m)
                        for m in _modificaciones_queryset()[:50]
                    ],
                },
                status=200,
            )

        if n == 0 and listos > 0:
            mensaje = (
                f"Hay {listos} documento(s) vinculado(s), pero el motor no detectó "
                "cambios aplicables (revise palabras clave: SE MODIFICA, SE INCORPORA, etc.). "
            )
            if resultado["errores"]:
                mensaje += " " + "; ".join(resultado["errores"][:3])
            return JsonResponse(
                {
                    "ok": False,
                    "mensaje": mensaje,
                    "stats": _stats_panel(),
                    "detalle": resultado,
                    "modificaciones": [
                        _serializar_modificacion(m)
                        for m in _modificaciones_queryset()[:50]
                    ],
                },
                status=200,
            )

        if n == 0:
            mensaje = "No hay modificatorios vinculados listos para procesar."
            return JsonResponse(
                {
                    "ok": False,
                    "mensaje": mensaje,
                    "stats": _stats_panel(),
                    "detalle": resultado,
                },
                status=200,
            )

        mensaje = f"Se han generado {n} ley(es) modificada(s) en la Carpeta 3."
        if v:
            mensaje += f" ({v} vinculación(es) automática(s) previa(s))"
        if resultado["omitidos"]:
            mensaje += f" · {resultado['omitidos']} omitido(s)"

        return JsonResponse(
            {
                "ok": True,
                "mensaje": mensaje,
                "ids": [r.id for r in resultado["generados"]],
                "stats": _stats_panel(),
                "modificaciones": [
                    _serializar_modificacion(m)
                    for m in _modificaciones_queryset()[:50]
                ],
                "detalle": {
                    "procesados": n,
                    "vinculadas_auto": v,
                    "sin_vincular": sin_v,
                    "errores": resultado["errores"][:5],
                },
            }
        )
    except Exception as e:
        logger.exception("Error al procesar")
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)


@require_http_methods(["POST"])
def guardar_version_final(request, pk):
    try:
        resultado = get_object_or_404(LeyResultado, pk=pk)
        if request.content_type and "application/json" in request.content_type:
            data = json.loads(request.body)
            contenido = data.get("contenido", "")
        else:
            contenido = request.POST.get("contenido", "")
        if not contenido.strip():
            return JsonResponse(
                {"ok": False, "mensaje": "El contenido no puede estar vacío."},
                status=400,
            )
        resultado.contenido_final = asegurar_html(contenido)
        resultado.es_version_final = True
        resultado.save(
            update_fields=[
                "contenido_final",
                "es_version_final",
                "fecha_modificacion",
            ]
        )
        return JsonResponse(
            {
                "ok": True,
                "mensaje": f"Versión final v{resultado.version} guardada correctamente.",
            }
        )
    except json.JSONDecodeError:
        return JsonResponse({"ok": False, "mensaje": "JSON inválido"}, status=400)
    except Exception as e:
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)


@require_http_methods(["POST"])
def desactivar_ley(request, pk):
    ley = get_object_or_404(LeyOriginal, pk=pk)
    if ley.estado == LeyOriginal.Estado.ABROGADA:
        return JsonResponse(
            {
                "ok": False,
                "mensaje": "Esta ley está abrogada y no puede reactivarse desde aquí.",
            },
            status=400,
        )
    ley.marcar_inactiva()
    return JsonResponse(
        {
            "ok": True,
            "mensaje": f"Ley {ley.codigo_ley} desactivada (borrado lógico).",
            "stats": _stats_panel(),
        }
    )


@require_http_methods(["POST"])
def desactivar_resultado(request, pk):
    resultado = get_object_or_404(LeyResultado, pk=pk)
    resultado.activo = False
    resultado.save(update_fields=["activo"])
    return JsonResponse(
        {
            "ok": True,
            "mensaje": f"Resultado v{resultado.version} desactivado.",
            "stats": _stats_panel(),
        }
    )


@require_http_methods(["GET", "POST"])
def descargar_resultado(request, pk):
    resultado = get_object_or_404(
        LeyResultado.objects.select_related("ley_original"), pk=pk
    )
    formato = request.GET.get("formato", "docx").lower()

    if request.method == "POST":
        try:
            if request.content_type and "application/json" in request.content_type:
                data = json.loads(request.body)
                contenido = data.get("contenido", "")
            else:
                contenido = request.POST.get("contenido", "")
            if contenido.strip():
                resultado.contenido_final = asegurar_html(contenido)
                resultado.save(update_fields=["contenido_final", "fecha_modificacion"])
        except json.JSONDecodeError:
            pass

    ley = resultado.ley_original
    contenido = resultado.contenido_final
    codigo = ley.codigo_ley
    titulo = ley.titulo

    try:
        if formato == "pdf":
            datos = generar_pdf(contenido, titulo, codigo)
            content_type = "application/pdf"
            nombre = f"Ley_{codigo}_v{resultado.version}.pdf"
        else:
            datos = generar_docx(contenido, titulo, codigo)
            content_type = (
                "application/vnd.openxmlformats-officedocument"
                ".wordprocessingml.document"
            )
            nombre = f"Ley_{codigo}_v{resultado.version}.docx"
    except Exception as e:
        logger.exception("Error generando documento")
        return JsonResponse({"ok": False, "mensaje": str(e)}, status=500)

    response = HttpResponse(datos, content_type=content_type)
    response["Content-Disposition"] = f'attachment; filename="{nombre}"'
    return response


# ─────────────────────────────────────────────────────────────
# MÓDULO 2 — Dashboard de análisis
# ─────────────────────────────────────────────────────────────

@require_http_methods(["GET"])
def dashboard(request):
    """Vista principal del dashboard de análisis."""
    ctx = construir_dashboard_context()
    ctx["etapa"] = "dashboard"
    return render(request, "leyes/dashboard.html", ctx)


@require_http_methods(["GET"])
def api_dashboard_data(request):
    """JSON para actualizar gráficas AJAX (formato prompt maestro)."""
    return JsonResponse(construir_api_dashboard())


# ─────────────────────────────────────────────────────────────
# MÓDULO 3 — Pre-documento de cambios mejorado
# ─────────────────────────────────────────────────────────────

@require_http_methods(["GET"])
def predocumento(request, pk):
    """Vista del pre-documento de modificaciones para un resultado."""
    resultado = get_object_or_404(
        LeyResultado.objects.select_related("ley_original"), pk=pk
    )
    pi = resultado.preinforme or {}
    return render(request, "leyes/predocumento.html", {
        "resultado": resultado,
        "preinforme": pi,
        "etapa": "3",
    })


@require_http_methods(["GET"])
def api_predocumento(request, pk):
    """JSON con el pre-informe completo de un resultado."""
    resultado = get_object_or_404(LeyResultado, pk=pk)
    return JsonResponse({
        "ok": True,
        "preinforme": resultado.preinforme,
        "ley": resultado.ley_original.codigo_ley,
        "titulo": resultado.ley_original.titulo,
        "version": resultado.version,
    })
