from django.db import models
from django.db.models.functions import Lower


class CatalogoBase(models.Model):
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ('nombre',)

    def save(self, *args, **kwargs):
        self.nombre = self.nombre.strip()
        self.descripcion = self.descripcion.strip()
        super().save(*args, **kwargs)


class Materia(CatalogoBase):
    codigo = models.CharField(max_length=20, unique=True)

    class Meta(CatalogoBase.Meta):
        verbose_name = 'materia'
        verbose_name_plural = 'materias'
        constraints = [
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_materia_nombre_ci_unique',
            ),
        ]

    def save(self, *args, **kwargs):
        self.codigo = self.codigo.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class TipoNorma(CatalogoBase):
    codigo = models.CharField(max_length=10, unique=True)

    class Meta(CatalogoBase.Meta):
        verbose_name = 'tipo de norma'
        verbose_name_plural = 'tipos de norma'
        constraints = [
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_tiponorma_nombre_ci_unique',
            ),
        ]

    def save(self, *args, **kwargs):
        self.codigo = self.codigo.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class EfectoNormativo(CatalogoBase):
    codigo = models.CharField(max_length=2, unique=True)

    class Meta(CatalogoBase.Meta):
        verbose_name = 'efecto normativo'
        verbose_name_plural = 'efectos normativos'
        constraints = [
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_efecto_nombre_ci_unique',
            ),
        ]

    def save(self, *args, **kwargs):
        self.codigo = self.codigo.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class EntidadEmisora(CatalogoBase):
    sigla = models.CharField(max_length=20, unique=True)
    sitio_web = models.URLField(blank=True, default='')

    class Meta(CatalogoBase.Meta):
        verbose_name = 'entidad emisora'
        verbose_name_plural = 'entidades emisoras'
        constraints = [
            models.UniqueConstraint(
                Lower('nombre'),
                name='catalogos_entidad_nombre_ci_unique',
            ),
        ]

    def save(self, *args, **kwargs):
        self.sigla = self.sigla.strip().upper()
        self.sitio_web = self.sitio_web.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.sigla} - {self.nombre}'

# Create your models here.
