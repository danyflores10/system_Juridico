from django.db import migrations


def limpiar_metadatos_documentos(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='documentos').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('catalogos', '0006_eliminar_modulo_documentos'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(
            limpiar_metadatos_documentos,
            migrations.RunPython.noop,
        ),
    ]
