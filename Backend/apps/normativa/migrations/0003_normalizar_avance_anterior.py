from django.db import migrations


def normalizar_avance(apps, schema_editor):
    Documento = apps.get_model('normativa', 'Documento')
    Historial = apps.get_model('normativa', 'HistorialDocumento')
    Documento.objects.filter(estado='BORRADOR').update(estado='PENDIENTE_PROCESAMIENTO')
    Historial.objects.filter(accion='RECHAZADO').update(accion='DESCARTADO')
    for documento in Documento.objects.only('pk', 'created_at').iterator():
        Documento.objects.filter(pk=documento.pk).update(fecha_recepcion=documento.created_at)


class Migration(migrations.Migration):
    dependencies = [('normativa', '0002_recepcion_pdf_manual')]
    operations = [migrations.RunPython(normalizar_avance, migrations.RunPython.noop)]
