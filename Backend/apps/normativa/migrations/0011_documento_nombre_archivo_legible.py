from django.db import migrations, models


def _recortar_palabras(valor, limite):
    texto = ' '.join((valor or '').split())
    if len(texto) <= limite:
        return texto
    palabras = texto.split()
    resultado = []
    longitud = 0
    for palabra in palabras:
        adicional = len(palabra) + (1 if resultado else 0)
        if longitud + adicional > limite:
            break
        resultado.append(palabra)
        longitud += adicional
    return ' '.join(resultado)


def preparar_nombres_breves(apps, schema_editor):
    Documento = apps.get_model('normativa', 'Documento')
    for documento in Documento.objects.only(
        'id',
        'titulo',
        'objeto',
        'titulo_archivo',
        'objeto_resumido',
    ).iterator():
        cambios = []
        if not documento.titulo_archivo:
            documento.titulo_archivo = _recortar_palabras(documento.titulo, 80)
            cambios.append('titulo_archivo')
        if not documento.objeto_resumido:
            documento.objeto_resumido = _recortar_palabras(documento.objeto, 120)
            cambios.append('objeto_resumido')
        if cambios:
            documento.save(update_fields=cambios)


class Migration(migrations.Migration):

    dependencies = [
        ('normativa', '0010_preparar_bandeja_revision'),
    ]

    operations = [
        migrations.AddField(
            model_name='documento',
            name='titulo_archivo',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='documento',
            name='objeto_resumido',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.RunPython(
            preparar_nombres_breves,
            migrations.RunPython.noop,
        ),
    ]
