"""Listado de archivos y asociación automática ley ↔ modificación."""

import logging
import re
from dataclasses import dataclass
from pathlib import Path

from .paths import EXTENSIONES_VALIDAS, LEYES_ORIGINALES, MODIFICACIONES, asegurar_carpetas

logger = logging.getLogger(__name__)

PATRON_NUMERO_LEY = re.compile(
    r"(?:ley|l\.?)\s*[_\-\.]?\s*(\d{3,8})|(\d{3,8})",
    re.IGNORECASE,
)


@dataclass
class Asociacion:
    ley: Path
    modificacion: Path
    numero_ley: str
    metodo: str  # "nombre" | "contenido"


def _es_archivo_valido(ruta: Path) -> bool:
    return ruta.is_file() and ruta.suffix.lower() in EXTENSIONES_VALIDAS


def _extraer_numeros(texto: str) -> set[str]:
    numeros = set()
    for m in PATRON_NUMERO_LEY.finditer(texto):
        grupo = m.group(1) or m.group(2)
        if grupo:
            numeros.add(grupo)
    return numeros


def _indice_leyes() -> dict[str, Path]:
    indice: dict[str, Path] = {}
    for archivo in sorted(LEYES_ORIGINALES.iterdir()):
        if not _es_archivo_valido(archivo):
            continue
        for num in _extraer_numeros(archivo.stem):
            indice.setdefault(num, archivo)
    return indice


def listar_archivos():
    """Lista archivos de leyes_originales y modificaciones con logs."""
    asegurar_carpetas()
    leyes = [f for f in sorted(LEYES_ORIGINALES.iterdir()) if _es_archivo_valido(f)]
    mods = [f for f in sorted(MODIFICACIONES.iterdir()) if _es_archivo_valido(f)]

    logger.info("=== Carpeta leyes_originales (%s) ===", LEYES_ORIGINALES)
    if leyes:
        for f in leyes:
            logger.info("  [LEY] %s (%d bytes)", f.name, f.stat().st_size)
    else:
        logger.warning("  (vacía o sin archivos válidos)")

    logger.info("=== Carpeta modificaciones (%s) ===", MODIFICACIONES)
    if mods:
        for f in mods:
            logger.info("  [MOD] %s (%d bytes)", f.name, f.stat().st_size)
    else:
        logger.warning("  (vacía o sin archivos válidos)")

    return leyes, mods


def asociar_modificaciones() -> list[Asociacion]:
    """Asocia cada archivo de modificaciones con su ley original."""
    asegurar_carpetas()
    indice = _indice_leyes()
    _, mods = listar_archivos()
    asociaciones: list[Asociacion] = []
    usadas: set[Path] = set()

    logger.info("=== Asociación automática ===")

    for mod in mods:
        candidatos: list[tuple[str, str]] = []

        for num in _extraer_numeros(mod.stem):
            if num in indice:
                candidatos.append((num, "nombre"))

        try:
            contenido = mod.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            logger.error("  No se pudo leer %s: %s", mod.name, e)
            continue

        for num in _extraer_numeros(contenido):
            if num in indice and (num, "contenido") not in [
                (c[0], c[1]) for c in candidatos
            ]:
                if not any(c[0] == num for c in candidatos):
                    candidatos.append((num, "contenido"))

        if not candidatos:
            logger.warning("  [SIN MATCH] %s → ninguna ley detectada", mod.name)
            continue

        num, metodo = candidatos[0]
        ley = indice[num]
        asociaciones.append(
            Asociacion(ley=ley, modificacion=mod, numero_ley=num, metodo=metodo)
        )
        usadas.add(mod)
        logger.info(
            "  [OK] %s → %s (ley %s, vía %s)",
            mod.name,
            ley.name,
            num,
            metodo,
        )

    sin_asociar = [m for m in mods if m not in usadas]
    if sin_asociar:
        logger.warning("Modificaciones sin asociar: %d", len(sin_asociar))

    logger.info("Total asociaciones: %d", len(asociaciones))
    return asociaciones
