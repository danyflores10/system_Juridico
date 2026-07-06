import ipaddress
import socket
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator


def validar_codigo_fuente(value):
    if ';' in value:
        raise ValidationError('El código no puede contener punto y coma (;).')


def _validar_ip_publica(address):
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return
    if not ip.is_global:
        raise ValidationError(
            'No se permiten localhost, direcciones privadas ni reservadas.'
        )


def validar_url_fuente(value):
    if not value:
        return
    URLValidator(schemes=('http', 'https'))(value)
    parsed = urlsplit(value)
    if parsed.scheme not in {'http', 'https'}:
        raise ValidationError('La URL debe utilizar http o https.')
    if parsed.username or parsed.password:
        raise ValidationError('La URL no puede incluir credenciales.')
    hostname = (parsed.hostname or '').lower().rstrip('.')
    if not hostname:
        raise ValidationError('La URL debe incluir un dominio válido.')
    if getattr(settings, 'ALLOW_PRIVATE_SOURCE_URLS', False):
        return
    if hostname == 'localhost' or hostname.endswith('.localhost'):
        raise ValidationError('No se permiten URLs de localhost.')
    _validar_ip_publica(hostname)
    try:
        addresses = {
            result[4][0]
            for result in socket.getaddrinfo(hostname, parsed.port or 443)
        }
    except socket.gaierror:
        return
    for address in addresses:
        _validar_ip_publica(address)
