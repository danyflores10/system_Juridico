from pathlib import Path

from django.conf import settings

BASE_DIR = Path(settings.BASE_DIR)

LEYES_ORIGINALES = BASE_DIR / "leyes_originales"
MODIFICACIONES = BASE_DIR / "modificaciones"
RESULTADOS = BASE_DIR / "resultados"

EXTENSIONES_VALIDAS = {".txt", ".md", ".html", ".htm", ".doc", ".docx"}


def asegurar_carpetas():
    for carpeta in (LEYES_ORIGINALES, MODIFICACIONES, RESULTADOS):
        carpeta.mkdir(parents=True, exist_ok=True)
