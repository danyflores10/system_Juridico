from django.db import transaction
from django.utils import timezone

from .models import (
    ArchivoDocumento,
    Documento,
    HistorialDocumento,
    OrigenDocumento,
)
from .validators import validar_y_calcular_pdf


def registrar_historial(documento, accion, usuario=None, *, estado_anterior='', estado_nuevo='', descripcion=''):
    return HistorialDocumento.objects.create(
        documento=documento,
        accion=accion,
        usuario=usuario if getattr(usuario, 'is_authenticated', False) else None,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
        descripcion=descripcion,
    )


@transaction.atomic
def recibir_pdf_manual(archivo, usuario=None):
    hash_sha256 = validar_y_calcular_pdf(archivo)
    archivo_guardado = None
    try:
        documento = Documento.objects.create(
            tipo_origen=Documento.TipoOrigen.CARGA_MANUAL,
            estado=Documento.Estado.PENDIENTE_PROCESAMIENTO,
            created_by=usuario if getattr(usuario, 'is_authenticated', False) else None,
        )
        registro = ArchivoDocumento.objects.create(
            documento=documento,
            archivo=archivo,
            nombre_original=archivo.name,
            mime_type='application/pdf',
            tamano_bytes=archivo.size,
            hash_sha256=hash_sha256,
            created_by=usuario if getattr(usuario, 'is_authenticated', False) else None,
        )
        archivo_guardado = registro.archivo
        registrar_historial(
            documento,
            HistorialDocumento.Accion.ARCHIVO_CARGADO,
            usuario,
            estado_nuevo=documento.estado,
            descripcion=f'PDF original recibido: {registro.nombre_original}.',
        )
        return documento
    except Exception:
        if archivo_guardado:
            archivo_guardado.delete(save=False)
        raise


@transaction.atomic
def recibir_pdf_automatico(archivo, fuente, url_origen, seccion=None):
    """Registra un PDF remoto o vincula un origen adicional si ya existe."""
    hash_sha256 = validar_y_calcular_pdf(archivo)

    origen_existente = OrigenDocumento.objects.select_related('documento').filter(
        fuente=fuente,
        seccion=seccion,
        url_origen=url_origen,
        documento__eliminado_at__isnull=True,
    ).first()
    if origen_existente:
        return origen_existente.documento, False, hash_sha256

    archivo_existente = ArchivoDocumento.objects.select_related('documento').filter(
        tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL,
        hash_sha256=hash_sha256,
        documento__eliminado_at__isnull=True,
    ).first()
    if archivo_existente:
        OrigenDocumento.objects.get_or_create(
            documento=archivo_existente.documento,
            fuente=fuente,
            seccion=seccion,
            url_origen=url_origen,
        )
        return archivo_existente.documento, False, hash_sha256

    archivo_guardado = None
    try:
        documento = Documento.objects.create(
            tipo_origen=Documento.TipoOrigen.DESCARGA_AUTOMATICA,
            estado=Documento.Estado.PENDIENTE_PROCESAMIENTO,
        )
        registro = ArchivoDocumento.objects.create(
            documento=documento,
            archivo=archivo,
            nombre_original=archivo.name,
            mime_type='application/pdf',
            tamano_bytes=archivo.size,
            hash_sha256=hash_sha256,
        )
        archivo_guardado = registro.archivo
        OrigenDocumento.objects.create(
            documento=documento,
            fuente=fuente,
            seccion=seccion,
            url_origen=url_origen,
        )
        registrar_historial(
            documento,
            HistorialDocumento.Accion.DESCARGADO_AUTOMATICAMENTE,
            estado_nuevo=documento.estado,
            descripcion=(
                f'PDF descargado automáticamente desde {fuente.nombre}: '
                f'{registro.nombre_original}.'
            ),
        )
        return documento, True, hash_sha256
    except Exception:
        if archivo_guardado:
            archivo_guardado.delete(save=False)
        raise


@transaction.atomic
def descartar_documento(documento, usuario=None):
    anterior = documento.estado
    documento.estado = Documento.Estado.DESCARTADO
    documento.eliminado_at = timezone.now()
    documento.save(update_fields=('estado', 'eliminado_at', 'updated_at'))
    registrar_historial(
        documento,
        HistorialDocumento.Accion.DESCARTADO,
        usuario,
        estado_anterior=anterior,
        estado_nuevo=documento.estado,
        descripcion='Documento descartado mediante borrado lógico; el PDF original se conserva.',
    )
    return documento
