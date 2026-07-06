from django.conf import settings
from django.db import models

from apps.catalogos.models import EntidadEmisora, Materia

from .validators import validar_codigo_fuente, validar_url_fuente


class FuenteWeb(models.Model):
    class TipoFuente(models.TextChoices):
        PORTAL_WEB = 'PORTAL_WEB', 'Portal web'
        API = 'API', 'API'
        RSS = 'RSS', 'RSS'
        REPOSITORIO = 'REPOSITORIO', 'Repositorio documental'

    class MotorConsulta(models.TextChoices):
        HTTPX = 'HTTPX', 'HTTPX / HTML estático'
        PLAYWRIGHT = 'PLAYWRIGHT', 'Playwright / JavaScript'

    class FrecuenciaConsulta(models.TextChoices):
        MANUAL = 'MANUAL', 'Manual'
        DIARIA = 'DIARIA', 'Diaria'
        SEMANAL = 'SEMANAL', 'Semanal'

    class EstadoPrueba(models.TextChoices):
        NO_PROBADO = 'NO_PROBADO', 'No probado'
        DISPONIBLE = 'DISPONIBLE', 'Disponible'
        ERROR = 'ERROR', 'Error'

    codigo = models.CharField(
        max_length=30,
        unique=True,
        validators=(validar_codigo_fuente,),
    )
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    url_base = models.URLField(validators=(validar_url_fuente,))
    url_consulta_principal = models.URLField(
        blank=True,
        default='',
        validators=(validar_url_fuente,),
    )
    tipo_fuente = models.CharField(
        max_length=20,
        choices=TipoFuente.choices,
        default=TipoFuente.PORTAL_WEB,
    )
    motor_consulta = models.CharField(
        max_length=20,
        choices=MotorConsulta.choices,
        default=MotorConsulta.HTTPX,
    )
    requiere_javascript = models.BooleanField(default=False)
    requiere_autenticacion = models.BooleanField(default=False)
    frecuencia_consulta = models.CharField(
        max_length=20,
        choices=FrecuenciaConsulta.choices,
        default=FrecuenciaConsulta.MANUAL,
    )
    materia_predeterminada = models.ForeignKey(
        Materia,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='fuentes_predeterminadas',
    )
    entidad_emisora_predeterminada = models.ForeignKey(
        EntidadEmisora,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='fuentes_predeterminadas',
    )
    configuracion = models.JSONField(default=dict, blank=True)
    activa = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)
    ultimo_estado_prueba = models.CharField(
        max_length=20,
        choices=EstadoPrueba.choices,
        default=EstadoPrueba.NO_PROBADO,
    )
    ultima_prueba_en = models.DateTimeField(null=True, blank=True)
    ultimo_codigo_http = models.PositiveSmallIntegerField(null=True, blank=True)
    ultimo_mensaje_prueba = models.TextField(blank=True, default='')
    ultimo_error_prueba = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('orden', 'nombre')
        verbose_name = 'fuente web'
        verbose_name_plural = 'fuentes web'

    def save(self, *args, **kwargs):
        self.codigo = self.codigo.strip().upper()
        self.nombre = ' '.join(self.nombre.split())
        self.descripcion = self.descripcion.strip()
        self.url_base = self.url_base.strip()
        self.url_consulta_principal = self.url_consulta_principal.strip()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.activa = False
        self.save(update_fields=('activa', 'updated_at'))

    def __str__(self):
        return f'{self.codigo} - {self.nombre}'


class FuenteSeccion(models.Model):
    fuente = models.ForeignKey(
        FuenteWeb,
        on_delete=models.CASCADE,
        related_name='secciones',
    )
    codigo = models.CharField(max_length=30, validators=(validar_codigo_fuente,))
    nombre = models.CharField(max_length=150)
    descripcion = models.TextField(blank=True, default='')
    url_listado = models.URLField(validators=(validar_url_fuente,))
    url_busqueda = models.URLField(
        blank=True,
        default='',
        validators=(validar_url_fuente,),
    )
    materia_predeterminada = models.ForeignKey(
        Materia,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='secciones_fuente_predeterminadas',
    )
    configuracion = models.JSONField(default=dict, blank=True)
    activa = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('orden', 'nombre')
        verbose_name = 'sección de fuente'
        verbose_name_plural = 'secciones de fuentes'
        constraints = (
            models.UniqueConstraint(
                fields=('fuente', 'codigo'),
                name='unique_codigo_por_fuente',
            ),
        )

    def save(self, *args, **kwargs):
        self.codigo = self.codigo.strip().upper()
        self.nombre = ' '.join(self.nombre.split())
        self.descripcion = self.descripcion.strip()
        self.url_listado = self.url_listado.strip()
        self.url_busqueda = self.url_busqueda.strip()
        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False):
        self.activa = False
        self.save(update_fields=('activa', 'updated_at'))

    def __str__(self):
        return f'{self.fuente.codigo} - {self.nombre}'


class EjecucionFuente(models.Model):
    class TipoEjecucion(models.TextChoices):
        PRUEBA_CONEXION = 'PRUEBA_CONEXION', 'Prueba de conexión'
        EJECUCION_MANUAL = 'EJECUCION_MANUAL', 'Ejecución manual'
        EJECUCION_PROGRAMADA = 'EJECUCION_PROGRAMADA', 'Ejecución programada'

    class Estado(models.TextChoices):
        EN_PROCESO = 'EN_PROCESO', 'En proceso'
        EXITOSA = 'EXITOSA', 'Exitosa'
        PARCIAL = 'PARCIAL', 'Parcial'
        ERROR = 'ERROR', 'Error'

    fuente = models.ForeignKey(
        FuenteWeb,
        on_delete=models.CASCADE,
        related_name='ejecuciones',
    )
    seccion = models.ForeignKey(
        FuenteSeccion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ejecuciones',
    )
    tipo_ejecucion = models.CharField(
        max_length=30,
        choices=TipoEjecucion.choices,
        default=TipoEjecucion.PRUEBA_CONEXION,
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.EN_PROCESO,
    )
    inicio = models.DateTimeField()
    fin = models.DateTimeField(null=True, blank=True)
    codigo_http = models.PositiveSmallIntegerField(null=True, blank=True)
    documentos_encontrados = models.PositiveIntegerField(default=0)
    documentos_descargados = models.PositiveIntegerField(default=0)
    documentos_duplicados = models.PositiveIntegerField(default=0)
    documentos_omitidos = models.PositiveIntegerField(default=0)
    total_errores = models.PositiveIntegerField(default=0)
    paginas_revisadas = models.PositiveIntegerField(default=0)
    tarea_id = models.CharField(max_length=255, blank=True, default='')
    duracion_ms = models.PositiveBigIntegerField(null=True, blank=True)
    mensaje = models.TextField(blank=True, default='')
    detalle_error = models.TextField(blank=True, default='')
    solicitado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ejecuciones_fuentes_solicitadas',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-inicio', '-id')
        verbose_name = 'ejecución de fuente'
        verbose_name_plural = 'ejecuciones de fuentes'

    def __str__(self):
        return f'{self.fuente.codigo} - {self.get_estado_display()}'


class HallazgoFuente(models.Model):
    class Estado(models.TextChoices):
        DESCUBIERTO = 'DESCUBIERTO', 'Descubierto'
        DESCARGADO = 'DESCARGADO', 'Descargado'
        DUPLICADO = 'DUPLICADO', 'Duplicado'
        OMITIDO = 'OMITIDO', 'Omitido'
        ERROR = 'ERROR', 'Error'

    ejecucion = models.ForeignKey(
        EjecucionFuente,
        on_delete=models.CASCADE,
        related_name='hallazgos',
    )
    fuente = models.ForeignKey(
        FuenteWeb,
        on_delete=models.PROTECT,
        related_name='hallazgos',
    )
    seccion = models.ForeignKey(
        FuenteSeccion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hallazgos',
    )
    documento = models.ForeignKey(
        'normativa.Documento',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hallazgos_fuente',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.DESCUBIERTO,
        db_index=True,
    )
    url = models.URLField(max_length=2000)
    titulo_encontrado = models.CharField(max_length=500, blank=True, default='')
    nombre_archivo = models.CharField(max_length=255, blank=True, default='')
    codigo_http = models.PositiveSmallIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=150, blank=True, default='')
    tamano_bytes = models.PositiveBigIntegerField(default=0)
    hash_sha256 = models.CharField(max_length=64, blank=True, default='', db_index=True)
    mensaje = models.TextField(blank=True, default='')
    detalle_error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at', '-id')
        constraints = (
            models.UniqueConstraint(
                fields=('ejecucion', 'url'),
                name='fuentes_hallazgo_url_ejecucion_unica',
            ),
        )
        indexes = (
            models.Index(
                fields=('fuente', 'estado', '-created_at'),
                name='fuente_hallazgo_estado_idx',
            ),
        )
        verbose_name = 'hallazgo de fuente'
        verbose_name_plural = 'hallazgos de fuentes'

    def __str__(self):
        return f'{self.fuente.codigo} - {self.get_estado_display()}'
