from django.db import migrations
from django.utils import timezone


def preparar_bandeja(apps, schema_editor):
    Documento = apps.get_model('normativa', 'Documento')
    ResultadoConversion = apps.get_model('normativa', 'ResultadoConversion')

    Documento.objects.filter(
        estado='LISTO_PARA_CONVERSION',
    ).update(estado='PENDIENTE_APROBACION')

    atascados = ResultadoConversion.objects.filter(
        estado__in=('EN_COLA', 'CONVIRTIENDO'),
        documento__estado='PENDIENTE_APROBACION',
    )
    atascados.update(
        estado='ERROR',
        finalizado_at=timezone.now(),
        error_codigo='FICHA_INCOMPLETA',
        error_mensaje=(
            'La ficha jurídica necesita aprobación antes de convertirse.'
        ),
        detalles_tecnicos={'recuperado_por_migracion': True},
    )


class Migration(migrations.Migration):

    dependencies = [
        ('normativa', '0009_alter_documento_estado_and_more'),
    ]

    operations = [
        migrations.RunPython(preparar_bandeja, migrations.RunPython.noop),
    ]
