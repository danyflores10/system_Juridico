import tempfile
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.normativa.conversion import _hash_archivo, _pdf_tiene_texto_buscable
from apps.normativa.models import ArchivoDocumento, ResultadoConversion


class Command(BaseCommand):
    help = (
        'Crea el PDF de consulta con la misma nomenclatura del Word '
        'sin modificar el PDF original.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--codigo', help='Procesar únicamente este código interno.')
        parser.add_argument('--dry-run', action='store_true', help='Mostrar cambios sin guardar archivos.')

    def handle(self, *args, **options):
        queryset = ResultadoConversion.objects.filter(
            estado=ResultadoConversion.Estado.COMPLETADA,
            archivo__isnull=False,
        ).exclude(archivo='').select_related('documento')
        if options['codigo']:
            queryset = queryset.filter(documento__codigo_interno=options['codigo'])
        if not queryset.exists():
            raise CommandError('No se encontraron conversiones completadas.')

        creados = 0
        omitidos = 0
        for resultado in queryset.iterator():
            storage = resultado._meta.get_field('archivo_pdf').storage
            if (
                resultado.archivo_pdf
                and storage.exists(resultado.archivo_pdf.name)
            ):
                omitidos += 1
                continue

            fuente = resultado.documento.archivos.filter(
                tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_PROCESADO,
            ).first()
            if fuente is None:
                fuente = resultado.documento.archivos.filter(
                    tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL,
                ).first()
            if fuente is None or not fuente.archivo:
                self.stderr.write(self.style.ERROR(
                    f'{resultado.documento.codigo_interno}: no existe un PDF fuente.'
                ))
                continue

            nombre_pdf = f'{Path(resultado.nombre_archivo).stem}.pdf'
            carpeta = resultado.carpeta_materia
            ruta_destino = f'{carpeta}/{nombre_pdf}'
            self.stdout.write(
                f'{resultado.documento.codigo_interno}: {ruta_destino}'
            )
            if options['dry_run']:
                continue

            archivo_creado = False
            nombre_guardado = ruta_destino
            with tempfile.TemporaryDirectory(prefix='pdf-consulta-') as temporal:
                copia = Path(temporal) / 'consulta.pdf'
                with fuente.archivo.open('rb') as origen, copia.open('wb') as destino:
                    for bloque in iter(lambda: origen.read(1024 * 1024), b''):
                        destino.write(bloque)
                hash_pdf = _hash_archivo(copia)
                tamano_pdf = copia.stat().st_size
                texto_buscable = _pdf_tiene_texto_buscable(copia)

                if storage.exists(ruta_destino):
                    with storage.open(ruta_destino, 'rb') as existente:
                        import hashlib

                        digest = hashlib.sha256()
                        for bloque in iter(lambda: existente.read(1024 * 1024), b''):
                            digest.update(bloque)
                    if digest.hexdigest() != hash_pdf:
                        raise CommandError(
                            f'{resultado.documento.codigo_interno}: '
                            'ya existe otro PDF con la nomenclatura final.'
                        )
                else:
                    with copia.open('rb') as contenido:
                        nombre_guardado = storage.save(
                            ruta_destino,
                            File(contenido, name=nombre_pdf),
                        )
                    archivo_creado = True
                    if nombre_guardado != ruta_destino:
                        storage.delete(nombre_guardado)
                        raise CommandError(
                            f'{resultado.documento.codigo_interno}: '
                            'no se pudo reservar el mismo nombre para Word y PDF.'
                        )

                try:
                    with transaction.atomic():
                        locked = ResultadoConversion.objects.select_for_update().get(
                            pk=resultado.pk,
                        )
                        detalles = dict(locked.detalles_tecnicos or {})
                        detalles['pdf_consulta_fuente'] = fuente.tipo_archivo
                        detalles['pdf_consulta_texto_buscable'] = texto_buscable
                        locked.archivo_pdf.name = nombre_guardado
                        locked.nombre_archivo_pdf = nombre_pdf
                        locked.ruta_pdf_relativa = nombre_guardado
                        locked.hash_pdf_sha256 = hash_pdf
                        locked.tamano_pdf_bytes = tamano_pdf
                        locked.pdf_texto_buscable = texto_buscable
                        locked.detalles_tecnicos = detalles
                        locked.save(update_fields=(
                            'archivo_pdf',
                            'nombre_archivo_pdf',
                            'ruta_pdf_relativa',
                            'hash_pdf_sha256',
                            'tamano_pdf_bytes',
                            'pdf_texto_buscable',
                            'detalles_tecnicos',
                            'updated_at',
                        ))
                except Exception:
                    if archivo_creado:
                        storage.delete(nombre_guardado)
                    raise
            creados += 1

        self.stdout.write(self.style.SUCCESS(
            f'PDF de consulta creados: {creados}. Sin cambios: {omitidos}.'
        ))
