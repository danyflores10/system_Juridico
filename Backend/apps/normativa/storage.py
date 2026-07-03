import re
from pathlib import Path

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible
from django.utils.functional import cached_property


@deconstructible
class NormativaFinalStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(base_url=None)

    @cached_property
    def base_location(self):
        return settings.FINAL_NORMATIVA_ROOT

    def get_valid_name(self, name):
        # La nomenclatura jurídica usa espacios y punto y coma de forma
        # intencional. Los componentes ya fueron saneados antes de guardar.
        basename = Path(name).name
        return re.sub(r'[<>:"/\\|?*\x00-\x1f]', ' ', basename).strip(' .')
