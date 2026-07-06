"""Carga de archivos al sistema y persistencia en base de datos."""

import logging

from django.db import transaction

from leyes.models import LeyOriginal, ModificacionDocumento

from .document_parser import extension_permitida, extraer_texto_archivo
from .extractor import (
    detectar_palabras_clave,
    extraer_codigo_ley,
    extraer_titulo,
)
from .metadatos_legislativos import parsear_nombre_archivo, titulo_desde_metadatos
from .vinculador import vincular_automatica, vincular_modificaciones_pendientes


def _resolver_codigo_titulo(nombre: str, contenido: str) -> tuple[str | None, str]:
    meta = parsear_nombre_archivo(nombre)
    if meta and meta.codigo_norma:
        return meta.codigo_norma, titulo_desde_metadatos(meta)
    codigo = extraer_codigo_ley(nombre, contenido)
    titulo = extraer_titulo(contenido, nombre)
    return codigo, titulo

logger = logging.getLogger(__name__)


@transaction.atomic
def ingestar_leyes(archivos) -> list[LeyOriginal]:
    creadas: list[LeyOriginal] = []
    for archivo in archivos:
        nombre = getattr(archivo, "name", "sin_nombre.txt")
        if not extension_permitida(nombre):
            logger.warning("Omitido (extensión no válida): %s", nombre)
            continue
        try:
            contenido, _ = extraer_texto_archivo(archivo)
        except Exception as e:
            logger.error("Error extrayendo %s: %s", nombre, e)
            continue
        if not contenido.strip():
            logger.warning("Sin texto extraíble: %s", nombre)
            continue
        codigo, titulo = _resolver_codigo_titulo(nombre, contenido)
        if not codigo:
            logger.warning("No se detectó código en: %s", nombre)
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
            creadas.append(existente)
        else:
            ley = LeyOriginal.objects.create(
                codigo_ley=codigo,
                titulo=titulo,
                contenido_completo=contenido,
                archivo_origen=nombre,
            )
            creadas.append(ley)
        logger.info("Registrada Ley %s desde %s", codigo, nombre)
    return creadas


@transaction.atomic
def ingestar_modificaciones(archivos) -> list[ModificacionDocumento]:
    creadas: list[ModificacionDocumento] = []
    for archivo in archivos:
        nombre = getattr(archivo, "name", "mod_sin_nombre.txt")
        if not extension_permitida(nombre):
            logger.warning("Omitido: %s", nombre)
            continue
        try:
            contenido, _ = extraer_texto_archivo(archivo)
        except Exception as e:
            logger.error("Error extrayendo %s: %s", nombre, e)
            continue
        if not contenido.strip():
            logger.warning("Sin texto en modificatorio: %s", nombre)
            continue
        codigo, _ = _resolver_codigo_titulo(nombre, contenido)
        codigo = codigo or ""
        claves = detectar_palabras_clave(contenido)
        mod = ModificacionDocumento.objects.create(
            archivo_origen=nombre,
            contenido=contenido,
            codigo_ley_detectado=codigo,
            palabras_clave_detectadas=", ".join(claves),
            estado_vinculacion=ModificacionDocumento.EstadoVinculacion.PENDIENTE,
        )
        vincular_automatica(mod)
        creadas.append(mod)
    vincular_modificaciones_pendientes()
    return creadas
