from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.normativa.conversion import ErrorConversion, asegurar_pdf_consulta
from apps.normativa.models import ResultadoConversion


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
        errores = 0
        for resultado in queryset.iterator():
            storage = resultado._meta.get_field('archivo_pdf').storage
            if (
                resultado.archivo_pdf
                and storage.exists(resultado.archivo_pdf.name)
            ):
                omitidos += 1
                continue

            nombre_pdf = f'{Path(resultado.nombre_archivo).stem}.pdf'
            self.stdout.write(
                f'{resultado.documento.codigo_interno}: '
                f'{resultado.carpeta_materia}/{nombre_pdf}'
            )
            if options['dry_run']:
                continue

            try:
                creado = asegurar_pdf_consulta(resultado)
            except ErrorConversion as exc:
                errores += 1
                self.stderr.write(self.style.ERROR(
                    f'{resultado.documento.codigo_interno}: {exc.mensaje}'
                ))
                continue
            if creado:
                creados += 1
            else:
                omitidos += 1

        self.stdout.write(self.style.SUCCESS(
            f'PDF de consulta creados: {creados}. Sin cambios: {omitidos}. Errores: {errores}.'
        ))
