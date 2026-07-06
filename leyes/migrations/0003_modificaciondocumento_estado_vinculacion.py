from django.db import migrations, models


def sincronizar_estados(apps, schema_editor):
    Mod = apps.get_model("leyes", "ModificacionDocumento")
    for mod in Mod.objects.all():
        if mod.procesado:
            mod.estado_vinculacion = "procesado"
        elif mod.ley_original_id:
            mod.estado_vinculacion = "vinculada"
        else:
            mod.estado_vinculacion = "pendiente"
        mod.save(update_fields=["estado_vinculacion"])


class Migration(migrations.Migration):

    dependencies = [
        ("leyes", "0002_leyresultado_activo_alter_leyoriginal_estado"),
    ]

    operations = [
        migrations.AddField(
            model_name="modificaciondocumento",
            name="estado_vinculacion",
            field=models.CharField(
                choices=[
                    ("pendiente", "Ley no vinculada"),
                    ("vinculada", "Vinculada — Lista para procesar"),
                    ("procesado", "Procesado exitosamente"),
                ],
                db_index=True,
                default="pendiente",
                max_length=20,
            ),
        ),
        migrations.RunPython(sincronizar_estados, migrations.RunPython.noop),
    ]
