"""Guardado automático de la norma modificada (requisito III del módulo).

La norma resultante se escribe en el servidor local dentro de
«NORMATIVA ACTUALIZADA/<Materia>/» en formato Word y PDF, con la
nomenclatura oficial:

    Efecto; TipoNorma; Número; FechaPromulgación; Título; Objeto; Materia

Efecto normativo: AA = Abrogada, DD = Derogada (norma con derogaciones).
"""
import logging
import re
from pathlib import Path

from django.conf import settings

from apps.modificador.models import LeyOriginal, LeyResultado

from .exportador import generar_docx, generar_pdf
from .metadatos_legislativos import parsear_nombre_archivo

logger = logging.getLogger(__name__)

CARACTERES_INVALIDOS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def carpeta_normativa_actualizada() -> Path:
    raiz = getattr(settings, 'NORMATIVA_ACTUALIZADA_ROOT', None)
    if raiz:
        return Path(raiz)
    return Path(settings.BASE_DIR) / 'NORMATIVA ACTUALIZADA'


def _sanitizar(fragmento: str, max_len: int = 90) -> str:
    limpio = CARACTERES_INVALIDOS.sub('-', fragmento).strip().strip('.')
    limpio = re.sub(r'\s+', ' ', limpio)
    return limpio[:max_len].strip()


def _componentes_nomenclatura(resultado: LeyResultado) -> dict:
    ley = resultado.ley_original
    meta = parsear_nombre_archivo(ley.archivo_origen)

    efecto = 'AA' if ley.estado == LeyOriginal.Estado.ABROGADA else 'DD'

    if meta:
        partes = meta.norma.split()
        tipo = partes[0].upper() if partes else 'L'
        numero = meta.codigo_norma or ley.codigo_ley
        fecha = meta.fecha
        titulo = meta.descripcion
        objeto = meta.ambito
        materia = meta.rama
    else:
        tipo = 'L'
        numero = ley.codigo_ley
        fecha = ley.fecha_carga.strftime('%d-%m-%Y')
        titulo = ley.titulo
        objeto = 'Texto consolidado'
        materia = 'General'

    return {
        'efecto': efecto,
        'tipo': _sanitizar(tipo, 8),
        'numero': _sanitizar(numero, 12),
        'fecha': _sanitizar(fecha, 12),
        'titulo': _sanitizar(titulo, 80),
        'objeto': _sanitizar(objeto, 60),
        'materia': _sanitizar(materia, 60) or 'General',
    }


def nombre_archivo_resultado(resultado: LeyResultado) -> tuple[str, str]:
    """Retorna (nombre_base_con_nomenclatura, materia)."""
    c = _componentes_nomenclatura(resultado)
    nombre = (
        f"{c['efecto']}; {c['tipo']}; {c['numero']}; {c['fecha']}; "
        f"{c['titulo']}; {c['objeto']}; {c['materia']} (v{resultado.version})"
    )
    return nombre, c['materia']


def guardar_resultado_automatico(resultado: LeyResultado) -> dict:
    """Genera Word y PDF de la norma modificada en la carpeta de la materia.

    Retorna {'docx': ruta, 'pdf': ruta} o {'error': mensaje}. Nunca lanza:
    el fallo de guardado se registra como alerta, no aborta el proceso.
    """
    try:
        nombre, materia = nombre_archivo_resultado(resultado)
        carpeta = carpeta_normativa_actualizada() / materia
        carpeta.mkdir(parents=True, exist_ok=True)

        ley = resultado.ley_original
        contenido = resultado.contenido_final
        titulo = ley.titulo
        codigo = ley.codigo_ley

        ruta_docx = carpeta / f'{nombre}.docx'
        ruta_pdf = carpeta / f'{nombre}.pdf'
        ruta_docx.write_bytes(generar_docx(contenido, titulo, codigo))
        ruta_pdf.write_bytes(generar_pdf(contenido, titulo, codigo))

        resultado.archivo_docx = str(ruta_docx)
        resultado.archivo_pdf = str(ruta_pdf)
        resultado.save(update_fields=['archivo_docx', 'archivo_pdf'])
        logger.info('Norma consolidada guardada: %s', ruta_docx)
        return {'docx': str(ruta_docx), 'pdf': str(ruta_pdf)}
    except Exception as e:  # noqa: BLE001 — se convierte en alerta de auditoría
        logger.exception('Error guardando resultado %s', resultado.pk)
        return {'error': str(e)}
