from django.db import models
from django.db.models.functions import Lower

from .validators import (
    validar_codigo_catalogo,
    validar_codigo_efecto,
    validar_carpeta_destino,
    validar_regex,
)


class BaseCatalogo(models.Model):
    codigo = models.CharField(
        max_length=30,
        unique=True,
        validators=(validar_codigo_catalogo,),
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ('orden', 'nombre')

    def save(self, *args, **kwargs):
        self.codigo = self.codigo.strip().upper()
        self.nombre = ' '.join(self.nombre.split())
        self.descripcion = ' '.join(self.descripcion.split())
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.activo = False
        self.save(update_fields=('activo', 'updated_at'))


class TipoNorma(BaseCatalogo):
    abreviatura_archivo = models.CharField(max_length=10)
    requiere_numero = models.BooleanField(default=True)
    requiere_fecha = models.BooleanField(default=True)

    class Meta(BaseCatalogo.Meta):
        verbose_name = 'tipo de norma'
        verbose_name_plural = 'tipos de norma'
        constraints = (
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_tiponorma_nombre_ci_unique',
            ),
        )

    def save(self, *args, **kwargs):
        self.abreviatura_archivo = self.abreviatura_archivo.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class EfectoNormativo(BaseCatalogo):
    codigo = models.CharField(
        max_length=1,
        unique=True,
        validators=(validar_codigo_efecto,),
    )
    abreviatura_archivo = models.CharField(max_length=1)
    es_efecto_final = models.BooleanField(default=False)

    class Meta(BaseCatalogo.Meta):
        verbose_name = 'efecto normativo'
        verbose_name_plural = 'efectos normativos'
        constraints = (
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_efecto_nombre_ci_unique',
            ),
        )

    def save(self, *args, **kwargs):
        self.abreviatura_archivo = self.abreviatura_archivo.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class Materia(BaseCatalogo):
    slug = models.SlugField(max_length=150, unique=True)
    carpeta_destino = models.CharField(
        max_length=100,
        unique=True,
        validators=(validar_carpeta_destino,),
    )
    color_etiqueta = models.CharField(max_length=20, blank=True, default='')
    requiere_revision = models.BooleanField(default=True)

    class Meta(BaseCatalogo.Meta):
        verbose_name = 'materia'
        verbose_name_plural = 'materias'
        constraints = (
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_materia_nombre_ci_unique',
            ),
        )

    def save(self, *args, **kwargs):
        self.slug = self.slug.strip().lower()
        self.carpeta_destino = ' '.join(self.carpeta_destino.split())
        self.color_etiqueta = self.color_etiqueta.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class EntidadEmisora(BaseCatalogo):
    class TipoEntidad(models.TextChoices):
        LEGISLATIVO = 'LEGISLATIVO', 'Legislativo'
        EJECUTIVO = 'EJECUTIVO', 'Ejecutivo'
        JUDICIAL = 'JUDICIAL', 'Judicial'
        CONSTITUCIONAL = 'CONSTITUCIONAL', 'Constitucional'
        TRIBUTARIO = 'TRIBUTARIO', 'Tributario'
        ADUANERO = 'ADUANERO', 'Aduanero'
        MINISTERIAL = 'MINISTERIAL', 'Ministerial'
        MUNICIPAL = 'MUNICIPAL', 'Municipal'
        OTRO = 'OTRO', 'Otro'

    codigo = models.CharField(
        max_length=30,
        unique=True,
        validators=(validar_codigo_catalogo,),
    )
    sigla = models.CharField(max_length=30, unique=True)
    tipo_entidad = models.CharField(
        max_length=30,
        choices=TipoEntidad.choices,
        default=TipoEntidad.OTRO,
    )
    sitio_web = models.URLField(blank=True, default='')
    nivel = models.CharField(max_length=30, blank=True, default='NACIONAL')

    class Meta(BaseCatalogo.Meta):
        verbose_name = 'entidad emisora'
        verbose_name_plural = 'entidades emisoras'
        constraints = (
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_entidad_nombre_ci_unique',
            ),
        )

    def save(self, *args, **kwargs):
        self.sigla = self.sigla.strip().upper()
        self.tipo_entidad = self.tipo_entidad.strip().upper()
        self.sitio_web = self.sitio_web.strip()
        self.nivel = self.nivel.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.sigla} - {self.nombre}'


class PatronTipoNorma(models.Model):
    tipo_norma = models.ForeignKey(
        TipoNorma,
        on_delete=models.PROTECT,
        related_name='patrones_deteccion',
    )
    patron_regex = models.TextField(validators=(validar_regex,))
    ejemplo_texto = models.CharField(max_length=250, blank=True, default='')
    prioridad = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('prioridad', 'id')
        verbose_name = 'patrón de tipo de norma'
        verbose_name_plural = 'patrones de tipo de norma'
        constraints = (
            models.UniqueConstraint(
                fields=('tipo_norma', 'patron_regex'),
                name='catalogos_patron_tipo_regex_unique',
            ),
        )

    def __str__(self):
        return f'{self.tipo_norma.codigo}: {self.patron_regex}'


class PalabraClaveMateria(models.Model):
    materia = models.ForeignKey(
        Materia,
        on_delete=models.PROTECT,
        related_name='palabras_clave_deteccion',
    )
    palabra_clave = models.CharField(max_length=150)
    peso = models.PositiveIntegerField(default=1)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-peso', 'palabra_clave')
        verbose_name = 'palabra clave de materia'
        verbose_name_plural = 'palabras clave de materia'
        constraints = (
            models.UniqueConstraint(
                Lower('palabra_clave'),
                'materia',
                name='catalogos_palabra_materia_ci_unique',
            ),
        )

    def save(self, *args, **kwargs):
        self.palabra_clave = ' '.join(self.palabra_clave.split())
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.materia.codigo}: {self.palabra_clave}'


class ReglaEfectoNormativo(models.Model):
    efecto_normativo = models.ForeignKey(
        EfectoNormativo,
        on_delete=models.PROTECT,
        related_name='reglas_deteccion',
    )
    expresion = models.CharField(max_length=250)
    prioridad = models.PositiveIntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('prioridad', 'expresion')
        verbose_name = 'regla de efecto normativo'
        verbose_name_plural = 'reglas de efecto normativo'
        constraints = (
            models.UniqueConstraint(
                Lower('expresion'),
                'efecto_normativo',
                name='catalogos_regla_efecto_ci_unique',
            ),
        )

    def save(self, *args, **kwargs):
        self.expresion = ' '.join(self.expresion.split()).upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.efecto_normativo.codigo}: {self.expresion}'
