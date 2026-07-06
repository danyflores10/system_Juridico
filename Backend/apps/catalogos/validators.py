import re
from pathlib import PurePath

from django.core.exceptions import ValidationError


CARACTERES_INVALIDOS_CARPETA = set('/\\:*?"<>|;')


def validar_codigo_catalogo(value):
    if ';' in value:
        raise ValidationError('El código no puede contener punto y coma (;).')


def validar_codigo_efecto(value):
    value = value.strip()
    if not re.fullmatch(r'[A-Z]', value):
        raise ValidationError('El código debe ser una sola letra mayúscula.')


def validar_carpeta_destino(value):
    value = value.strip()
    es_ruta_absoluta = PurePath(value).is_absolute()
    if (
        not value
        or es_ruta_absoluta
        or '..' in value
        or any(char in value for char in CARACTERES_INVALIDOS_CARPETA)
    ):
        raise ValidationError(
            'La carpeta no puede contener barras, caracteres inválidos ni rutas relativas.'
        )


def validar_regex(value):
    try:
        re.compile(value)
    except re.error as exc:
        raise ValidationError(f'El patrón regex no es válido: {exc}.') from exc
