from django.db import transaction
from django.utils.text import slugify

from .models import (
    EntidadEmisora,
    EfectoNormativo,
    Materia,
    PalabraClaveMateria,
    PatronTipoNorma,
    ReglaEfectoNormativo,
    TipoNorma,
)


TIPOS_NORMA = (
    ('SC', 'Sentencia Constitucional'),
    ('DC', 'Declaración Constitucional'),
    ('AC', 'Auto Constitucional'),
    ('AS', 'Auto Supremo'),
    ('L', 'Ley'),
    ('DL', 'Decreto Ley'),
    ('DS', 'Decreto Supremo'),
    ('RS', 'Resolución Suprema'),
    ('RM', 'Resolución Ministerial'),
    ('RA', 'Resolución Administrativa'),
    ('RND', 'Resolución Normativa de Directorio'),
    ('RARA', 'Resolución que Absuelve el Recurso de Alzada'),
    ('RARR', 'Resolución que Absuelve el Recurso de Revocatoria'),
    ('RARJ', 'Resolución que Absuelve el Recurso Jerárquico'),
    ('RRDL', 'Resolución de Restitución de Derechos Laborales'),
)

EFECTOS_NORMATIVOS = (
    ('O', 'Originaria', False),
    ('A', 'Abrogatoria', True),
    ('D', 'Derogatoria', True),
)

MATERIAS = (
    ('TRIBUTARIO', 'Derecho Tributario'),
    ('ADUANERO', 'Derecho Aduanero'),
    ('LABORAL', 'Derecho Laboral'),
    ('CONSTITUCIONAL', 'Derecho Constitucional'),
    ('ADMINISTRATIVO', 'Derecho Administrativo'),
    ('CIVIL', 'Derecho Civil'),
    ('PENAL', 'Derecho Penal'),
    ('COMERCIAL', 'Derecho Comercial'),
    ('PROCESAL', 'Derecho Procesal'),
    ('MUNICIPAL', 'Derecho Municipal'),
    ('AMBIENTAL', 'Derecho Ambiental'),
    ('OTROS', 'Otras Materias'),
)

ENTIDADES = (
    ('ALP', 'Asamblea Legislativa Plurinacional', 'LEGISLATIVO'),
    ('SIN', 'Servicio de Impuestos Nacionales', 'TRIBUTARIO'),
    ('AN', 'Aduana Nacional', 'ADUANERO'),
    ('TCP', 'Tribunal Constitucional Plurinacional', 'CONSTITUCIONAL'),
    ('TSJ', 'Tribunal Supremo de Justicia', 'JUDICIAL'),
    ('MEFP', 'Ministerio de Economía y Finanzas Públicas', 'MINISTERIAL'),
    ('MT', 'Ministerio de Trabajo', 'MINISTERIAL'),
)

PATRONES = (
    ('L', r'\bLEY\s+(?:N[°ºO.]?\s*)?(\d+)\b', 'LEY N° 2492'),
    (
        'DS',
        r'\bDECRETO\s+SUPREMO\s+(?:N[°ºO.]?\s*)?(\d+)\b',
        'DECRETO SUPREMO N° 4850',
    ),
)

PALABRAS_CLAVE = (
    ('TRIBUTARIO', 'tributo', 10),
    ('TRIBUTARIO', 'impuesto', 10),
    ('ADUANERO', 'aduana', 10),
)

REGLAS_EFECTO = (
    ('A', 'ABRÓGASE'),
    ('A', 'ABROGA'),
    ('D', 'DERÓGASE'),
    ('D', 'DEROGA'),
)


@transaction.atomic
def seed_catalogos():
    for orden, (codigo, nombre) in enumerate(TIPOS_NORMA, start=1):
        TipoNorma.objects.update_or_create(
            codigo=codigo,
            defaults={
                'nombre': nombre,
                'abreviatura_archivo': codigo,
                'requiere_numero': True,
                'requiere_fecha': True,
                'activo': True,
                'orden': orden,
            },
        )

    for orden, (codigo, nombre, es_final) in enumerate(
        EFECTOS_NORMATIVOS,
        start=1,
    ):
        EfectoNormativo.objects.update_or_create(
            codigo=codigo,
            defaults={
                'nombre': nombre,
                'abreviatura_archivo': codigo,
                'es_efecto_final': es_final,
                'activo': True,
                'orden': orden,
            },
        )

    for orden, (codigo, nombre) in enumerate(MATERIAS, start=1):
        Materia.objects.update_or_create(
            codigo=codigo,
            defaults={
                'nombre': nombre,
                'slug': slugify(nombre),
                'carpeta_destino': nombre,
                'requiere_revision': True,
                'activo': True,
                'orden': orden,
            },
        )

    for orden, (sigla, nombre, tipo_entidad) in enumerate(ENTIDADES, start=1):
        EntidadEmisora.objects.update_or_create(
            codigo=sigla,
            defaults={
                'sigla': sigla,
                'nombre': nombre,
                'tipo_entidad': tipo_entidad,
                'nivel': 'NACIONAL',
                'activo': True,
                'orden': orden,
            },
        )

    for prioridad, (codigo, patron, ejemplo) in enumerate(PATRONES, start=1):
        PatronTipoNorma.objects.update_or_create(
            tipo_norma=TipoNorma.objects.get(codigo=codigo),
            patron_regex=patron,
            defaults={
                'ejemplo_texto': ejemplo,
                'prioridad': prioridad,
                'activo': True,
            },
        )

    for codigo, palabra, peso in PALABRAS_CLAVE:
        PalabraClaveMateria.objects.update_or_create(
            materia=Materia.objects.get(codigo=codigo),
            palabra_clave=palabra,
            defaults={'peso': peso, 'activo': True},
        )

    for prioridad, (codigo, expresion) in enumerate(REGLAS_EFECTO, start=1):
        ReglaEfectoNormativo.objects.update_or_create(
            efecto_normativo=EfectoNormativo.objects.get(codigo=codigo),
            expresion=expresion,
            defaults={'prioridad': prioridad, 'activo': True},
        )

    return {
        'tipos_norma': TipoNorma.objects.count(),
        'efectos_normativos': EfectoNormativo.objects.count(),
        'materias': Materia.objects.count(),
        'entidades_emisoras': EntidadEmisora.objects.count(),
        'patrones_tipo_norma': PatronTipoNorma.objects.count(),
        'palabras_clave_materia': PalabraClaveMateria.objects.count(),
        'reglas_efecto_normativo': ReglaEfectoNormativo.objects.count(),
    }
