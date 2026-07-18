import apps.normativa.models
import apps.normativa.storage
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('normativa', '0011_documento_nombre_archivo_legible'),
    ]

    operations = [
        migrations.AddField(
            model_name='resultadoconversion',
            name='archivo_pdf',
            field=models.FileField(
                blank=True,
                max_length=1000,
                null=True,
                storage=apps.normativa.storage.NormativaFinalStorage(),
                upload_to=apps.normativa.models.archivo_final_path,
            ),
        ),
        migrations.AddField(
            model_name='resultadoconversion',
            name='hash_pdf_sha256',
            field=models.CharField(blank=True, db_index=True, default='', max_length=64),
        ),
        migrations.AddField(
            model_name='resultadoconversion',
            name='nombre_archivo_pdf',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
        migrations.AddField(
            model_name='resultadoconversion',
            name='pdf_texto_buscable',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='resultadoconversion',
            name='ruta_pdf_relativa',
            field=models.CharField(blank=True, default='', max_length=1000),
        ),
        migrations.AddField(
            model_name='resultadoconversion',
            name='tamano_pdf_bytes',
            field=models.PositiveBigIntegerField(default=0),
        ),
    ]
