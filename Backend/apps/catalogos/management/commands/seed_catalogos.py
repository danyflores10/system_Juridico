from django.core.management.base import BaseCommand

from apps.catalogos.services import seed_catalogos


class Command(BaseCommand):
    help = 'Crea o actualiza los catálogos jurídicos iniciales sin duplicarlos.'

    def handle(self, *args, **options):
        conteos = seed_catalogos()
        detalle = ', '.join(
            f'{nombre}: {cantidad}' for nombre, cantidad in conteos.items()
        )
        self.stdout.write(self.style.SUCCESS(f'Catálogos actualizados. {detalle}'))
