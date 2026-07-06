import fitz
from django.conf import settings


def pagina_dominada_por_imagen(pagina):
    """Detect pages whose visible background is essentially a scanned image.

    OCR-enabled scanned PDFs often contain plenty of selectable text, so text
    length alone cannot distinguish them from native PDFs.  A page-sized image
    is the reliable signal needed by the Word conversion path.
    """
    area_pagina = pagina.rect.get_area()
    if area_pagina <= 0:
        return False

    cobertura = 0.0
    for imagen in pagina.get_image_info():
        rectangulo = fitz.Rect(imagen.get('bbox', ())) & pagina.rect
        if rectangulo.is_empty:
            continue
        cobertura += rectangulo.get_area() / area_pagina

    umbral = getattr(settings, 'PDF_SCANNED_IMAGE_COVERAGE', 0.80)
    return min(cobertura, 1.0) >= umbral


def pdf_tiene_paginas_dominadas_por_imagen(ruta_pdf):
    with fitz.open(ruta_pdf) as pdf:
        return any(pagina_dominada_por_imagen(pagina) for pagina in pdf)
