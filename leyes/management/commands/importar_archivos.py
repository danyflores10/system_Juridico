"""Importa archivos existentes de las carpetas planas a la base de datos."""

from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand

from leyes.services.ingesta import ingestar_leyes, ingestar_modificaciones
from leyes.services.motor_db import procesar_todas_pendientes


class Command(BaseCommand):
    help = "Importa leyes_originales/ y modificaciones/ al sistema en BD"

    def handle(self, *args, **options):
        base = Path(settings.BASE_DIR)
        leyes_dir = base / "leyes_originales"
        mods_dir = base / "modificaciones"

        # Crear carpetas si no existen
        leyes_dir.mkdir(parents=True, exist_ok=True)
        mods_dir.mkdir(parents=True, exist_ok=True)

        exts = ["*.txt", "*.md", "*.pdf", "*.docx"]
        archivos_ley = []
        for ext in exts:
            archivos_ley += list(leyes_dir.glob(ext))

        archivos_mod = []
        for ext in exts:
            archivos_mod += list(mods_dir.glob(ext))

        self.stdout.write(f"📂 Originales encontrados: {len(archivos_ley)}")
        self.stdout.write(f"📂 Modificatorios encontrados: {len(archivos_mod)}")

        uploads_ley = []
        for p in sorted(archivos_ley):
            uploads_ley.append(
                SimpleUploadedFile(
                    p.name,
                    p.read_bytes(),
                    content_type="application/octet-stream",
                )
            )
        if uploads_ley:
            creadas = ingestar_leyes(uploads_ley)
            self.stdout.write(self.style.SUCCESS(f"✅ Leyes registradas: {len(creadas)}"))
        else:
            self.stdout.write(self.style.WARNING("⚠️  Sin leyes originales en leyes_originales/"))

        uploads_mod = []
        for p in sorted(archivos_mod):
            uploads_mod.append(
                SimpleUploadedFile(
                    p.name,
                    p.read_bytes(),
                    content_type="application/octet-stream",
                )
            )
        if uploads_mod:
            mods = ingestar_modificaciones(uploads_mod)
            self.stdout.write(self.style.SUCCESS(f"✅ Modificatorios cargados: {len(mods)}"))
        else:
            self.stdout.write(self.style.WARNING("⚠️  Sin modificatorios en modificaciones/"))

        self.stdout.write("⚙️  Procesando modificaciones...")
        resultado = procesar_todas_pendientes()
        n = resultado.get("procesados", 0)
        sin_v = resultado.get("sin_vincular", 0)
        errores = resultado.get("errores", [])

        self.stdout.write(self.style.SUCCESS(f"✅ Resultados generados: {n}"))
        if sin_v:
            self.stdout.write(self.style.WARNING(
                f"⚠️  {sin_v} modificatorio(s) sin vincular automáticamente. "
                "Usa el panel → Etapa II para vincularlos manualmente."
            ))
        for e in errores[:5]:
            self.stdout.write(self.style.ERROR(f"   ✗ {e}"))

        self.stdout.write(self.style.SUCCESS("🎉 Importación completa. Inicia el servidor y abre http://localhost:8000"))
