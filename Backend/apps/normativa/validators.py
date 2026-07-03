import hashlib
from pathlib import Path

import fitz
from django.conf import settings
from rest_framework import serializers


def validar_y_calcular_pdf(upload):
    if Path(upload.name).suffix.lower() != '.pdf':
        raise serializers.ValidationError('El archivo debe tener extensión .pdf.')
    max_size = getattr(settings, 'MAX_PDF_UPLOAD_SIZE', 100 * 1024 * 1024)
    if upload.size <= 0:
        raise serializers.ValidationError('El archivo PDF está vacío.')
    if upload.size > max_size:
        raise serializers.ValidationError(f'El archivo supera el tamaño máximo de {max_size // (1024 * 1024)} MB.')

    upload.seek(0)
    if upload.read(5) != b'%PDF-':
        upload.seek(0)
        raise serializers.ValidationError('El contenido del archivo no corresponde a un PDF válido.')
    upload.seek(0)
    try:
        document = fitz.open(stream=upload.read(), filetype='pdf')
        if document.needs_pass:
            raise serializers.ValidationError('No se permiten archivos PDF protegidos con contraseña.')
        document.page_count
        document.close()
    except serializers.ValidationError:
        raise
    except Exception as exc:
        raise serializers.ValidationError('El archivo está dañado o no tiene una estructura PDF válida.') from exc

    upload.seek(0)
    digest = hashlib.sha256()
    for chunk in upload.chunks():
        digest.update(chunk)
    upload.seek(0)
    return digest.hexdigest()
