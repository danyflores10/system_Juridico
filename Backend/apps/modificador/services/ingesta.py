"""Carga de archivos al sistema y persistencia en base de datos.

Incluye control de duplicidades: una misma norma modificatoria no puede
duplicar el proceso modificatorio (requisito del módulo).
"""
import logging
from dataclasses import dataclass, field

from django.db import transaction

from apps.modificador.models import LeyOriginal, ModificacionDocumento

from .document_parser import extension_permitida, extraer_texto_archivo
from .extractor import detectar_palabras_clave, extraer_codigo_ley, extraer_titulo
from .metadatos_legislativos import parsear_nombre_archivo, titulo_desde_metadatos
from .vinculador import vincular_automatica, vincular_modificaciones_pendientes

logger = logging.getLogger(__name__)


@dataclass
class ResultadoIngesta:
    creadas: list = field(default_factory=list)
    duplicados: list[str] = field(default_factory=list)
    omitidos: list[str] = field(default_factory=list)


def _resolver_codigo_titulo(nombre: str, contenido: str) -> tuple[str | None, str]:
    meta = parsear_nombre_archivo(nombre)
    if meta and meta.codigo_norma:
        return meta.codigo_norma, titulo_desde_metadatos(meta)
    codigo = extraer_codigo_ley(nombre, contenido)
    titulo = extraer_titulo(contenido, nombre)
    return codigo, titulo


@transaction.atomic
def ingestar_leyes(archivos) -> ResultadoIngesta:
    resultado = ResultadoIngesta()
    for archivo in archivos:
        nombre = getattr(archivo, 'name', 'sin_nombre.txt')
        if not extension_permitida(nombre):
            logger.warning('Omitido (extensión no válida): %s', nombre)
            resultado.omitidos.append(f'{nombre}: extensión no permitida')
            continue
        try:
            contenido, _ = extraer_texto_archivo(archivo)
        except Exception as e:  # noqa: BLE001 — se reporta al usuario
            logger.error('Error extrayendo %s: %s', nombre, e)
            resultado.omitidos.append(f'{nombre}: {e}')
            continue
        if not contenido.strip():
            logger.warning('Sin texto extraíble: %s', nombre)
            resultado.omitidos.append(f'{nombre}: sin texto extraíble')
            continue
        codigo, titulo = _resolver_codigo_titulo(nombre, contenido)
        if not codigo:
            logger.warning('No se detectó código en: %s', nombre)
            resultado.omitidos.append(f'{nombre}: sin código de norma detectable')
            continue
        existente = LeyOriginal.objects.filter(
            codigo_ley=codigo, estado=LeyOriginal.Estado.ACTIVO
        ).first()
        if existente:
            existente.titulo = titulo
            existente.contenido_completo = contenido
            existente.archivo_origen = nombre
            existente.estado_proceso = LeyOriginal.EstadoProceso.PENDIENTE
            existente.save()
            resultado.creadas.append(existente)
        else:
            ley = LeyOriginal.objects.create(
                codigo_ley=codigo,
                titulo=titulo,
                contenido_completo=contenido,
                archivo_origen=nombre,
            )
            resultado.creadas.append(ley)
        logger.info('Registrada Ley %s desde %s', codigo, nombre)
    return resultado


@transaction.atomic
def ingestar_modificaciones(archivos) -> ResultadoIngesta:
    resultado = ResultadoIngesta()
    for archivo in archivos:
        nombre = getattr(archivo, 'name', 'mod_sin_nombre.txt')
        if not extension_permitida(nombre):
            logger.warning('Omitido: %s', nombre)
            resultado.omitidos.append(f'{nombre}: extensión no permitida')
            continue

        # Control de duplicidades: la misma norma modificatoria no puede
        # repetir el proceso una vez procesada.
        previa = ModificacionDocumento.objects.filter(archivo_origen=nombre).first()
        if previa and previa.procesado:
            logger.warning('Duplicado ya procesado: %s', nombre)
            resultado.duplicados.append(nombre)
            continue

        try:
            contenido, _ = extraer_texto_archivo(archivo)
        except Exception as e:  # noqa: BLE001 — se reporta al usuario
            logger.error('Error extrayendo %s: %s', nombre, e)
            resultado.omitidos.append(f'{nombre}: {e}')
            continue
        if not contenido.strip():
            logger.warning('Sin texto en modificatorio: %s', nombre)
            resultado.omitidos.append(f'{nombre}: sin texto extraíble')
            continue
        codigo, _ = _resolver_codigo_titulo(nombre, contenido)
        codigo = codigo or ''
        claves = detectar_palabras_clave(contenido)

        if previa:
            previa.contenido = contenido
            previa.codigo_ley_detectado = codigo
            previa.palabras_clave_detectadas = ', '.join(claves)
            previa.save(
                update_fields=[
                    'contenido',
                    'codigo_ley_detectado',
                    'palabras_clave_detectadas',
                ]
            )
            mod = previa
        else:
            mod = ModificacionDocumento.objects.create(
                archivo_origen=nombre,
                contenido=contenido,
                codigo_ley_detectado=codigo,
                palabras_clave_detectadas=', '.join(claves),
                estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PENDIENTE,
            )
        vincular_automatica(mod)
        resultado.creadas.append(mod)
    vincular_modificaciones_pendientes()
    return resultado
