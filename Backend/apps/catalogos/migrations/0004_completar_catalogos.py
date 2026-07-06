from django.db import migrations
from django.utils.text import slugify


TIPOS = (
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

CODIGOS_ANTERIORES = {
    'TRIB': 'TRIBUTARIO',
    'ADU': 'ADUANERO',
    'LAB': 'LABORAL',
    'CONST': 'CONSTITUCIONAL',
    'ADM': 'ADMINISTRATIVO',
    'CIV': 'CIVIL',
    'PEN': 'PENAL',
}

ENTIDADES = (
    ('ALP', 'Asamblea Legislativa Plurinacional', 'LEGISLATIVO'),
    ('SIN', 'Servicio de Impuestos Nacionales', 'TRIBUTARIO'),
    ('AN', 'Aduana Nacional', 'ADUANERO'),
    ('TCP', 'Tribunal Constitucional Plurinacional', 'CONSTITUCIONAL'),
    ('TSJ', 'Tribunal Supremo de Justicia', 'JUDICIAL'),
    ('MEFP', 'Ministerio de Economía y Finanzas Públicas', 'MINISTERIAL'),
    ('MT', 'Ministerio de Trabajo', 'MINISTERIAL'),
)


def completar_catalogos(apps, schema_editor):
    TipoNorma = apps.get_model('catalogos', 'TipoNorma')
    EfectoNormativo = apps.get_model('catalogos', 'EfectoNormativo')
    Materia = apps.get_model('catalogos', 'Materia')
    EntidadEmisora = apps.get_model('catalogos', 'EntidadEmisora')
    PatronTipoNorma = apps.get_model('catalogos', 'PatronTipoNorma')
    PalabraClaveMateria = apps.get_model('catalogos', 'PalabraClaveMateria')
    ReglaEfectoNormativo = apps.get_model('catalogos', 'ReglaEfectoNormativo')

    for orden, (codigo, nombre) in enumerate(TIPOS, start=1):
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

    for orden, (codigo, nombre) in enumerate(
        (('O', 'Originaria'), ('A', 'Abrogatoria'), ('D', 'Derogatoria')),
        start=1,
    ):
        EfectoNormativo.objects.update_or_create(
            codigo=codigo,
            defaults={
                'nombre': nombre,
                'abreviatura_archivo': codigo,
                'es_efecto_final': codigo in {'A', 'D'},
                'activo': True,
                'orden': orden,
            },
        )

    for codigo_anterior, codigo_nuevo in CODIGOS_ANTERIORES.items():
        Materia.objects.filter(codigo=codigo_anterior).update(codigo=codigo_nuevo)
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

    for entidad in EntidadEmisora.objects.all():
        entidad.codigo = entidad.sigla
        entidad.tipo_entidad = 'EJECUTIVO' if entidad.sigla == 'OE' else 'OTRO'
        entidad.nivel = 'NACIONAL'
        entidad.save(update_fields=('codigo', 'tipo_entidad', 'nivel'))
    for orden, (sigla, nombre, tipo) in enumerate(ENTIDADES, start=1):
        EntidadEmisora.objects.update_or_create(
            codigo=sigla,
            defaults={
                'sigla': sigla,
                'nombre': nombre,
                'tipo_entidad': tipo,
                'nivel': 'NACIONAL',
                'activo': True,
                'orden': orden,
            },
        )

    patrones = (
        ('L', r'\bLEY\s+(?:N[°ºO.]?\s*)?(\d+)\b', 'LEY N° 2492'),
        ('DS', r'\bDECRETO\s+SUPREMO\s+(?:N[°ºO.]?\s*)?(\d+)\b', 'DECRETO SUPREMO N° 4850'),
    )
    for prioridad, (codigo, patron, ejemplo) in enumerate(patrones, start=1):
        PatronTipoNorma.objects.update_or_create(
            tipo_norma=TipoNorma.objects.get(codigo=codigo),
            patron_regex=patron,
            defaults={
                'ejemplo_texto': ejemplo,
                'prioridad': prioridad,
                'activo': True,
            },
        )

    for codigo, palabra, peso in (
        ('TRIBUTARIO', 'tributo', 10),
        ('TRIBUTARIO', 'impuesto', 10),
        ('ADUANERO', 'aduana', 10),
    ):
        PalabraClaveMateria.objects.update_or_create(
            materia=Materia.objects.get(codigo=codigo),
            palabra_clave=palabra,
            defaults={'peso': peso, 'activo': True},
        )

    for prioridad, (codigo, expresion) in enumerate(
        (('A', 'ABRÓGASE'), ('A', 'ABROGA'), ('D', 'DERÓGASE'), ('D', 'DEROGA')),
        start=1,
    ):
        ReglaEfectoNormativo.objects.update_or_create(
            efecto_normativo=EfectoNormativo.objects.get(codigo=codigo),
            expresion=expresion,
            defaults={'prioridad': prioridad, 'activo': True},
        )


class Migration(migrations.Migration):
    dependencies = [('catalogos', '0003_alter_efectonormativo_options_and_more')]

    operations = [migrations.RunPython(completar_catalogos, migrations.RunPython.noop)]
