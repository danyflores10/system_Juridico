"""Carga los planes y promociones del Módulo 3 (requerimientos de Wilson)."""

from django.db import migrations

PLANES = [
    {
        'codigo': 'gratuito',
        'nombre': 'Plan Gratuito',
        'descripcion': (
            'Para conocer el sistema: acceso básico a la Biblioteca '
            'Jurídica en 1 dispositivo.'
        ),
        'dispositivos': 1,
        'dispositivos_variables': False,
        'destacado': False,
        'orden': 1,
        'beneficios': [
            'Acceso básico a la Biblioteca Jurídica',
            '1 dispositivo (celular, tablet o computadora)',
            'Sin acceso a la Biblioteca Doctrinal de autoría propia (SENAPI)',
        ],
        'precios': [],
    },
    {
        'codigo': 'estudiantil',
        'nombre': 'Plan Estudiantil',
        'descripcion': (
            'Para estudiantes de derecho: doctrina de autoría propia '
            'ilimitada a precio accesible.'
        ),
        'dispositivos': 1,
        'dispositivos_variables': False,
        'destacado': False,
        'orden': 2,
        'beneficios': [
            'Acceso limitado a la Biblioteca Jurídica',
            'Acceso ilimitado a la Biblioteca Doctrinal de autoría propia '
            'registrada en SENAPI',
            '1 dispositivo (celular, tablet o computadora)',
        ],
        'precios': [
            {'periodicidad': 'mensual', 'precio': '20.00'},
            {'periodicidad': 'semestral', 'precio': '100.00'},
        ],
    },
    {
        'codigo': 'profesional',
        'nombre': 'Plan Profesional',
        'descripcion': (
            'Para abogados en ejercicio: toda la Biblioteca Jurídica '
            'Actualizada y la doctrina propia, sin límites.'
        ),
        'dispositivos': 1,
        'dispositivos_variables': False,
        'destacado': True,
        'orden': 3,
        'beneficios': [
            'Acceso ilimitado a la Biblioteca Jurídica Actualizada',
            'Acceso ilimitado a la Biblioteca Doctrinal de autoría propia '
            'registrada en SENAPI',
            '1 dispositivo (celular, tablet o computadora)',
        ],
        'precios': [
            {'periodicidad': 'mensual', 'precio': '30.00'},
            {'periodicidad': 'anual', 'precio': '300.00'},
        ],
    },
    {
        'codigo': 'consultora',
        'nombre': 'Plan Consultora',
        'descripcion': (
            'Para estudios y consultoras jurídicas: acceso total en '
            'hasta 3 dispositivos.'
        ),
        'dispositivos': 3,
        'dispositivos_variables': False,
        'destacado': False,
        'orden': 4,
        'beneficios': [
            'Acceso ilimitado a la Biblioteca Jurídica',
            'Acceso ilimitado a la Biblioteca Doctrinal de autoría propia '
            'registrada en SENAPI',
            '3 dispositivos (celular, tablet o computadora)',
        ],
        'precios': [
            {'periodicidad': 'mensual', 'precio': '50.00'},
            {'periodicidad': 'anual', 'precio': '500.00'},
        ],
    },
    {
        'codigo': 'empresarial',
        'nombre': 'Plan Empresarial',
        'descripcion': (
            'Para instituciones y empresas: acceso total en la cantidad '
            'de dispositivos que su equipo necesite.'
        ),
        'dispositivos': 4,
        'dispositivos_variables': True,
        'destacado': False,
        'orden': 5,
        'beneficios': [
            'Acceso ilimitado a la Biblioteca Jurídica',
            'Acceso ilimitado a la Biblioteca Doctrinal de autoría propia '
            'registrada en SENAPI',
            'N dispositivos (celular, tablet o computadora)',
            'Costo variable en función del número de dispositivos',
        ],
        'precios': [],
    },
]


def cargar_planes(apps, schema_editor):
    Plan = apps.get_model('suscripciones', 'Plan')
    PrecioPlan = apps.get_model('suscripciones', 'PrecioPlan')
    for datos in PLANES:
        precios = datos.pop('precios')
        plan, _ = Plan.objects.update_or_create(
            codigo=datos['codigo'],
            defaults=datos,
        )
        for precio in precios:
            PrecioPlan.objects.update_or_create(
                plan=plan,
                periodicidad=precio['periodicidad'],
                defaults={'precio': precio['precio'], 'activo': True},
            )


def eliminar_planes(apps, schema_editor):
    Plan = apps.get_model('suscripciones', 'Plan')
    Plan.objects.filter(
        codigo__in=[p['codigo'] for p in PLANES]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('suscripciones', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(cargar_planes, eliminar_planes),
    ]
