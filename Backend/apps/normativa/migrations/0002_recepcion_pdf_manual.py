from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def completar_documentos(apps, schema_editor):
    Documento = apps.get_model('normativa', 'Documento')
    Documento.objects.filter(estado='RECHAZADO').update(estado='DESCARTADO')
    for documento in Documento.objects.filter(codigo_interno__isnull=True).iterator():
        documento.codigo_interno = f'DOC-{documento.pk:06d}'
        documento.save(update_fields=('codigo_interno',))


class Migration(migrations.Migration):
    dependencies = [('normativa', '0001_initial')]

    operations = [
        migrations.RemoveConstraint(model_name='archivodocumento', name='normativa_pdf_original_hash_unique'),
        migrations.AddField(model_name='documento', name='codigo_interno', field=models.CharField(editable=False, max_length=20, null=True, unique=True)),
        migrations.AddField(model_name='documento', name='tipo_origen', field=models.CharField(choices=[('CARGA_MANUAL', 'Carga manual'), ('DESCARGA_AUTOMATICA', 'Descarga automática')], db_index=True, default='CARGA_MANUAL', max_length=25)),
        migrations.AddField(model_name='documento', name='fecha_recepcion', field=models.DateTimeField(auto_now_add=True, db_index=True, default=django.utils.timezone.now), preserve_default=False),
        migrations.AlterField(model_name='documento', name='tipo_norma', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='documentos_normativos', to='catalogos.tiponorma')),
        migrations.AlterField(model_name='documento', name='efecto_normativo', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='documentos_normativos', to='catalogos.efectonormativo')),
        migrations.AlterField(model_name='documento', name='materia', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='documentos_normativos', to='catalogos.materia')),
        migrations.AlterField(model_name='documento', name='entidad_emisora', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='documentos_normativos', to='catalogos.entidademisora')),
        migrations.AlterField(model_name='documento', name='numero', field=models.CharField(blank=True, default='', max_length=50)),
        migrations.AlterField(model_name='documento', name='fecha_emision', field=models.DateField(blank=True, null=True)),
        migrations.AlterField(model_name='documento', name='titulo', field=models.CharField(blank=True, default='', max_length=500)),
        migrations.AlterField(model_name='documento', name='estado', field=models.CharField(choices=[('BORRADOR', 'Borrador'), ('PENDIENTE_PROCESAMIENTO', 'Pendiente de procesamiento'), ('PROCESANDO', 'Procesando'), ('PENDIENTE_REVISION', 'Pendiente de revisión'), ('VALIDADO', 'Validado'), ('ERROR', 'Error'), ('DESCARTADO', 'Descartado')], db_index=True, default='PENDIENTE_PROCESAMIENTO', max_length=30)),
        migrations.AlterField(model_name='origendocumento', name='fuente', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='documentos_normativos', to='fuentes.fuenteweb')),
        migrations.AlterField(model_name='historialdocumento', name='accion', field=models.CharField(choices=[('CREADO', 'Documento creado'), ('EDITADO', 'Documento editado'), ('ARCHIVO_CARGADO', 'Archivo cargado'), ('ENVIADO_PROCESAMIENTO', 'Enviado a procesamiento'), ('ESTADO_CAMBIADO', 'Estado cambiado'), ('DESCARTADO', 'Documento descartado')], max_length=30)),
        migrations.RunPython(completar_documentos, migrations.RunPython.noop),
    ]
