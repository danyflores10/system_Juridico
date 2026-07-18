"""Importa normas originales y modificatorias desde carpetas locales."""
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand

from apps.modificador.services.ingesta import ingestar_leyes, ingestar_modificaciones
from apps.modificador.services.motor_db import procesar_todas_pendientes

EXTENSIONES = ('*.txt', '*.md', '*.pdf', '*.docx', '*.html', '*.htm')


def _cargar_carpeta(carpeta: Path) -> list[SimpleUploadedFile]:
    archivos = []
    for patron in EXTENSIONES:
        archivos.extend(carpeta.glob(patron))
    return [
        SimpleUploadedFile(
            p.name, p.read_bytes(), content_type='application/octet-stream'
        )
        for p in sorted(archivos)
    ]


class Command(BaseCommand):
    help = 'Importa leyes originales y modificatorias desde carpetas al Módulo 2'

    def add_arguments(self, parser):
        base = Path(settings.BASE_DIR) / 'datos_ejemplo' / 'modificador'
        parser.add_argument(
            '--originales',
            default=str(base / 'leyes_originales'),
            help='Carpeta con las normas originales',
        )
        parser.add_argument(
            '--modificatorias',
            default=str(base / 'modificatorias'),
            help='Carpeta con las normas modificatorias',
        )
        parser.add_argument(
            '--procesar',
            action='store_true',
            help='Ejecuta el motor de modificaciones tras importar',
        )

    def handle(self, *args, **options):
        dir_leyes = Path(options['originales'])
        dir_mods = Path(options['modificatorias'])

        uploads_ley = _cargar_carpeta(dir_leyes) if dir_leyes.is_dir() else []
        uploads_mod = _cargar_carpeta(dir_mods) if dir_mods.is_dir() else []
        self.stdout.write(f'Originales encontrados: {len(uploads_ley)}')
        self.stdout.write(f'Modificatorios encontrados: {len(uploads_mod)}')

        if uploads_ley:
            res = ingestar_leyes(uploads_ley)
            self.stdout.write(
                self.style.SUCCESS(f'Leyes registradas: {len(res.creadas)}')
            )
            for om in res.omitidos:
                self.stdout.write(self.style.WARNING(f'  Omitido: {om}'))

        if uploads_mod:
            res = ingestar_modificaciones(uploads_mod)
            self.stdout.write(
                self.style.SUCCESS(f'Modificatorias registradas: {len(res.creadas)}')
            )
            for dup in res.duplicados:
                self.stdout.write(self.style.WARNING(f'  Duplicado: {dup}'))
            for om in res.omitidos:
                self.stdout.write(self.style.WARNING(f'  Omitido: {om}'))

        if options['procesar']:
            resumen = procesar_todas_pendientes()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Procesadas: {resumen['procesados']} · "
                    f"Sin vincular: {resumen['sin_vincular']} · "
                    f"Omitidas: {resumen['omitidos']}"
                )
            )
            for err in resumen['errores']:
                self.stdout.write(self.style.WARNING(f'  {err}'))
