from django.db import migrations


def eliminar_metadatos_documentos(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='documentos').delete()


class Migration(migrations.Migration):
    dependencies = [
        ('catalogos', '0005_alter_efectonormativo_abreviatura_archivo_and_more'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                'DROP TABLE IF EXISTS documentos_documentoarchivo CASCADE;'
                'DROP TABLE IF EXISTS documentos_documento_materias CASCADE;'
                'DROP TABLE IF EXISTS documentos_documento CASCADE;'
            ),
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunPython(
            eliminar_metadatos_documentos,
            migrations.RunPython.noop,
        ),
    ]
