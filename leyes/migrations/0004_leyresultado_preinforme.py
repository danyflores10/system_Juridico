# Generated manually for LEGISLACION PROYECTO

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("leyes", "0003_modificaciondocumento_estado_vinculacion"),
    ]

    operations = [
        migrations.AddField(
            model_name="leyresultado",
            name="preinforme",
            field=models.JSONField(
                blank=True,
                default=dict,
                verbose_name="Pre-informe de auditoría",
            ),
        ),
    ]
