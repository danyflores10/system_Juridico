import hashlib
import os
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.normativa.conversion import _nombre_disponible, generar_nomenclatura_final
from apps.normativa.models import ResultadoConversion


def _ruta_compatible(path):
    value = str(path)
    if os.name == 'nt' and not value.startswith('\\\\?\\'):
        return f'\\\\?\\{value}'
    return value


def _digest(stream):
    result = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        result.update(chunk)
    return result.hexdigest()


class Command(BaseCommand):
    help = 'Copia Word finales con rutas largas a nombres seguros y actualiza su registro.'

    def add_arguments(self, parser):
        parser.add_argument('--codigo', help='Reparar únicamente este código interno.')
        parser.add_argument('--dry-run', action='store_true', help='Mostrar cambios sin copiar archivos.')

    def handle(self, *args, **options):
        queryset = ResultadoConversion.objects.filter(
            estado=ResultadoConversion.Estado.COMPLETADA,
        ).select_related(
            'documento__tipo_norma',
            'documento__efecto_normativo',
            'documento__materia',
            'documento__entidad_emisora',
        )
        if options['codigo']:
            queryset = queryset.filter(documento__codigo_interno=options['codigo'])
        if not queryset.exists():
            raise CommandError('No se encontraron conversiones completadas para revisar.')

        repaired = 0
        skipped = 0
        for result in queryset.iterator():
            saved_name = None
            old_name = result.archivo.name if result.archivo else ''
            if not old_name:
                skipped += 1
                continue
            old_path = result.archivo.path
            safe_path = _ruta_compatible(old_path)
            source_exists = os.path.isfile(safe_path)
            normal_access = result.archivo.storage.exists(old_name)
            _, safe_name, _ = generar_nomenclatura_final(result.documento)
            needs_repair = not normal_access or Path(old_name).name != safe_name
            if not needs_repair:
                skipped += 1
                continue
            if not source_exists:
                self.stderr.write(self.style.ERROR(
                    f'{result.documento.codigo_interno}: no se encontró el archivo físico.'
                ))
                continue

            folder = result.carpeta_materia or result.documento.materia.carpeta_destino
            target_name, version = _nombre_disponible(
                result,
                folder,
                safe_name,
            )
            target_relative = f'{folder}/{target_name}'
            self.stdout.write(
                f'{result.documento.codigo_interno}: {len(old_path)} caracteres -> '
                f'{len(str(result.archivo.storage.path(target_relative)))} caracteres'
            )
            if options['dry_run']:
                continue

            try:
                with open(safe_path, 'rb') as source:
                    saved_name = result.archivo.storage.save(
                        target_relative,
                        File(source, name=target_name),
                    )
                with result.archivo.storage.open(saved_name, 'rb') as copied:
                    copied_hash = _digest(copied)
                copied_size = result.archivo.storage.size(saved_name)
                if result.hash_sha256 and copied_hash != result.hash_sha256:
                    result.archivo.storage.delete(saved_name)
                    raise CommandError(
                        f'{result.documento.codigo_interno}: la copia no coincide con el original.'
                    )
                if result.tamano_bytes and copied_size != result.tamano_bytes:
                    result.archivo.storage.delete(saved_name)
                    raise CommandError(
                        f'{result.documento.codigo_interno}: el tamaño de la copia no coincide.'
                    )

                with transaction.atomic():
                    locked = ResultadoConversion.objects.select_for_update().get(pk=result.pk)
                    if locked.archivo.name != old_name:
                        raise CommandError(
                            f'{result.documento.codigo_interno}: la ruta cambió durante la reparación.'
                        )
                    details = dict(locked.detalles_tecnicos or {})
                    details['ruta_anterior_resguardada'] = old_name
                    details['ruta_reparada'] = True
                    locked.archivo.name = saved_name
                    locked.nombre_archivo = Path(saved_name).name
                    locked.ruta_relativa = saved_name
                    locked.hash_sha256 = copied_hash
                    locked.tamano_bytes = copied_size
                    locked.version = version
                    locked.detalles_tecnicos = details
                    locked.save(update_fields=(
                        'archivo', 'nombre_archivo', 'ruta_relativa',
                        'hash_sha256', 'tamano_bytes', 'version',
                        'detalles_tecnicos', 'updated_at',
                    ))
                repaired += 1
                self.stdout.write(self.style.SUCCESS(
                    f'{result.documento.codigo_interno}: copia verificada y registro actualizado.'
                ))
            except Exception:
                if saved_name and result.archivo.storage.exists(saved_name):
                    result.archivo.storage.delete(saved_name)
                raise

        self.stdout.write(self.style.SUCCESS(
            f'Reparados: {repaired}. Sin cambios: {skipped}. '
            'Los archivos originales se conservaron como respaldo.'
        ))
