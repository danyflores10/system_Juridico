import uuid
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.catalogos.models import (
    EfectoNormativo,
    EntidadEmisora,
    Materia,
    TipoNorma,
)
from apps.fuentes.models import FuenteSeccion, FuenteWeb
from .storage import NormativaFinalStorage


def archivo_documento_path(instance, filename):
    from django.utils import timezone

    now = timezone.now()
    carpeta = (
        'entrada'
        if instance.tipo_archivo == ArchivoDocumento.TipoArchivo.PDF_ORIGINAL
        else 'procesados'
    )
    return f'{carpeta}/{now:%Y/%m}/{uuid.uuid4().hex}.pdf'


def archivo_final_path(instance, filename):
    return f'{instance.carpeta_materia}/{Path(filename).name}'


class Documento(models.Model):
    class TipoOrigen(models.TextChoices):
        CARGA_MANUAL = 'CARGA_MANUAL', 'Carga manual'
        DESCARGA_AUTOMATICA = 'DESCARGA_AUTOMATICA', 'Descarga automática'

    class Estado(models.TextChoices):
        BORRADOR = 'BORRADOR', 'Borrador'
        PENDIENTE_PROCESAMIENTO = (
            'PENDIENTE_PROCESAMIENTO',
            'Pendiente de procesamiento',
        )
        PROCESANDO = 'PROCESANDO', 'Procesando'
        PENDIENTE_EXTRACCION = (
            'PENDIENTE_EXTRACCION',
            'Pendiente de extracción jurídica',
        )
        PENDIENTE_REVISION = 'PENDIENTE_REVISION', 'Pendiente de revisión'
        CONTROL_CALIDAD = 'CONTROL_CALIDAD', 'Control de calidad'
        PENDIENTE_APROBACION = (
            'PENDIENTE_APROBACION',
            'Pendiente de aprobación jurídica',
        )
        LISTO_PARA_CONVERSION = 'LISTO_PARA_CONVERSION', 'Listo para conversión'
        PENDIENTE_REVISION_RAPIDA = (
            'PENDIENTE_REVISION_RAPIDA',
            'Pendiente de revisión rápida',
        )
        OBSERVADO = 'OBSERVADO', 'Observado'
        DUPLICADO_CONFIRMADO = 'DUPLICADO_CONFIRMADO', 'Duplicado confirmado'
        CONVIRTIENDO = 'CONVIRTIENDO', 'Convirtiendo a Word'
        ERROR_CONVERSION = 'ERROR_CONVERSION', 'Error de conversión'
        FINALIZADO = 'FINALIZADO', 'Finalizado'
        VALIDADO = 'VALIDADO', 'Validado'
        ERROR = 'ERROR', 'Error'
        DESCARTADO = 'DESCARTADO', 'Descartado'

    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    codigo_interno = models.CharField(max_length=20, unique=True, null=True, editable=False)
    tipo_origen = models.CharField(
        max_length=25,
        choices=TipoOrigen.choices,
        default=TipoOrigen.CARGA_MANUAL,
        db_index=True,
    )
    tipo_norma = models.ForeignKey(
        TipoNorma,
        on_delete=models.PROTECT,
        related_name='documentos_normativos', null=True, blank=True,
    )
    efecto_normativo = models.ForeignKey(
        EfectoNormativo,
        on_delete=models.PROTECT,
        related_name='documentos_normativos', null=True, blank=True,
    )
    materia = models.ForeignKey(
        Materia,
        on_delete=models.PROTECT,
        related_name='documentos_normativos', null=True, blank=True,
    )
    entidad_emisora = models.ForeignKey(
        EntidadEmisora,
        on_delete=models.PROTECT,
        related_name='documentos_normativos', null=True, blank=True,
    )
    numero = models.CharField(max_length=50, blank=True, default='')
    fecha_emision = models.DateField(null=True, blank=True)
    titulo = models.CharField(max_length=500, blank=True, default='')
    objeto = models.TextField(blank=True, default='')
    observaciones = models.TextField(blank=True, default='')
    nomenclatura_preliminar = models.CharField(
        max_length=1000,
        blank=True,
        default='',
        editable=False,
    )
    estado = models.CharField(
        max_length=30,
        choices=Estado.choices,
        default=Estado.PENDIENTE_PROCESAMIENTO,
        db_index=True,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documentos_normativos_creados',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    fecha_recepcion = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    eliminado_at = models.DateTimeField(null=True, blank=True, editable=False)
    documento_canonico = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='documentos_duplicados',
        editable=False,
    )

    class Meta:
        ordering = ('-created_at',)
        verbose_name = 'documento normativo'
        verbose_name_plural = 'documentos normativos'
        indexes = (
            models.Index(
                fields=('estado', '-created_at'),
                name='normativa_estado_fecha_idx',
            ),
            models.Index(
                fields=('tipo_norma', 'numero'),
                name='normativa_tipo_numero_idx',
            ),
        )

    def save(self, *args, **kwargs):
        self.numero = (self.numero or '').strip()
        self.titulo = ' '.join((self.titulo or '').split())
        self.objeto = self.objeto.strip()
        self.observaciones = self.observaciones.strip()
        super().save(*args, **kwargs)
        if not self.codigo_interno:
            self.codigo_interno = f'DOC-{self.pk:06d}'
            type(self).objects.filter(pk=self.pk).update(codigo_interno=self.codigo_interno)

    def __str__(self):
        return self.codigo_interno or str(self.uuid)


class ArchivoDocumento(models.Model):
    class TipoArchivo(models.TextChoices):
        PDF_ORIGINAL = 'PDF_ORIGINAL', 'PDF original'
        PDF_PROCESADO = 'PDF_PROCESADO', 'PDF procesado'
        PDF_OCR = 'PDF_OCR', 'PDF con OCR (legado)'
        WORD = 'WORD', 'Documento Word'

    documento = models.ForeignKey(
        Documento,
        on_delete=models.CASCADE,
        related_name='archivos',
    )
    tipo_archivo = models.CharField(
        max_length=20,
        choices=TipoArchivo.choices,
        default=TipoArchivo.PDF_ORIGINAL,
    )
    archivo = models.FileField(upload_to=archivo_documento_path, max_length=500)
    nombre_original = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    tamano_bytes = models.PositiveBigIntegerField()
    hash_sha256 = models.CharField(max_length=64, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='archivos_normativos_creados',
    )

    class Meta:
        ordering = ('created_at',)
        verbose_name = 'archivo de documento'
        verbose_name_plural = 'archivos de documentos'
        constraints = (
            models.UniqueConstraint(
                fields=('documento', 'tipo_archivo'),
                name='normativa_un_archivo_por_tipo',
            ),
        )

    def save(self, *args, **kwargs):
        if self.pk:
            previous = type(self).objects.only('archivo', 'tipo_archivo').get(pk=self.pk)
            if (
                previous.tipo_archivo == self.TipoArchivo.PDF_ORIGINAL
                and previous.archivo.name != self.archivo.name
            ):
                raise ValidationError(
                    'El archivo original es inmutable y no puede reemplazarse.'
                )
        self.nombre_original = Path(self.nombre_original).name
        self.mime_type = self.mime_type.strip().lower()
        self.hash_sha256 = self.hash_sha256.strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.documento} - {self.get_tipo_archivo_display()}'


class OrigenDocumento(models.Model):
    documento = models.ForeignKey(
        Documento,
        on_delete=models.CASCADE,
        related_name='origenes',
    )
    fuente = models.ForeignKey(
        FuenteWeb,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='documentos_normativos',
    )
    seccion = models.ForeignKey(
        FuenteSeccion,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='documentos_normativos',
    )
    url_origen = models.URLField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = (
            models.UniqueConstraint(
                fields=('documento', 'fuente', 'seccion', 'url_origen'),
                name='normativa_origen_documento_unico',
            ),
        )
        verbose_name = 'origen de documento'
        verbose_name_plural = 'orígenes de documentos'

    def clean(self):
        if self.seccion_id and self.seccion.fuente_id != self.fuente_id:
            raise ValidationError({
                'seccion': 'La sección seleccionada no pertenece a la fuente.'
            })

    def save(self, *args, **kwargs):
        self.url_origen = self.url_origen.strip()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.documento} - {self.fuente.codigo if self.fuente else "Sin fuente"}'


class HistorialDocumento(models.Model):
    class Accion(models.TextChoices):
        CREADO = 'CREADO', 'Documento creado'
        EDITADO = 'EDITADO', 'Documento editado'
        ARCHIVO_CARGADO = 'ARCHIVO_CARGADO', 'Archivo cargado'
        DESCARGADO_AUTOMATICAMENTE = (
            'DESCARGADO_AUTOMATICAMENTE',
            'Descargado automáticamente',
        )
        ENVIADO_PROCESAMIENTO = (
            'ENVIADO_PROCESAMIENTO',
            'Enviado a procesamiento',
        )
        ESTADO_CAMBIADO = 'ESTADO_CAMBIADO', 'Estado cambiado'
        PROCESAMIENTO_INICIADO = 'PROCESAMIENTO_INICIADO', 'Procesamiento iniciado'
        PROCESAMIENTO_COMPLETADO = 'PROCESAMIENTO_COMPLETADO', 'Procesamiento completado'
        PROCESAMIENTO_ERROR = 'PROCESAMIENTO_ERROR', 'Error de procesamiento'
        EXTRACCION_INICIADA = 'EXTRACCION_INICIADA', 'Extracción jurídica iniciada'
        EXTRACCION_COMPLETADA = 'EXTRACCION_COMPLETADA', 'Extracción jurídica completada'
        EXTRACCION_ERROR = 'EXTRACCION_ERROR', 'Error de extracción jurídica'
        CALIDAD_INICIADA = 'CALIDAD_INICIADA', 'Control de calidad iniciado'
        CALIDAD_COMPLETADA = 'CALIDAD_COMPLETADA', 'Control de calidad completado'
        CALIDAD_ERROR = 'CALIDAD_ERROR', 'Error de control de calidad'
        REVISION_INICIADA = 'REVISION_INICIADA', 'Revisión jurídica iniciada'
        CAMPO_JURIDICO_EDITADO = (
            'CAMPO_JURIDICO_EDITADO',
            'Campo jurídico editado',
        )
        ALERTA_REVISADA = 'ALERTA_REVISADA', 'Alerta revisada'
        REVISION_APROBADA = 'REVISION_APROBADA', 'Revisión jurídica aprobada'
        REVISION_DEVUELTA = 'REVISION_DEVUELTA', 'Revisión jurídica devuelta'
        DUPLICADO_DETECTADO = 'DUPLICADO_DETECTADO', 'Duplicado detectado'
        CONVERSION_INICIADA = 'CONVERSION_INICIADA', 'Conversión a Word iniciada'
        CONVERSION_COMPLETADA = 'CONVERSION_COMPLETADA', 'Conversión a Word completada'
        CONVERSION_ERROR = 'CONVERSION_ERROR', 'Error de conversión a Word'
        DESCARTADO = 'DESCARTADO', 'Documento descartado'

    documento = models.ForeignKey(
        Documento,
        on_delete=models.CASCADE,
        related_name='historial',
    )
    accion = models.CharField(max_length=30, choices=Accion.choices)
    estado_anterior = models.CharField(max_length=30, blank=True, default='')
    estado_nuevo = models.CharField(max_length=30, blank=True, default='')
    descripcion = models.TextField(blank=True, default='')
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='historial_documentos_normativos',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at', '-id')
        verbose_name = 'historial de documento'
        verbose_name_plural = 'historiales de documentos'

    def __str__(self):
        return f'{self.documento} - {self.get_accion_display()}'


class ResultadoProcesamiento(models.Model):
    class Estado(models.TextChoices):
        EN_COLA = 'EN_COLA', 'En cola'
        PROCESANDO = 'PROCESANDO', 'Procesando'
        COMPLETADO = 'COMPLETADO', 'Completado'
        ERROR = 'ERROR', 'Error'

    class TipoPdf(models.TextChoices):
        TEXTO = 'TEXTO', 'PDF con texto'
        ESCANEADO = 'ESCANEADO', 'PDF escaneado'
        MIXTO = 'MIXTO', 'PDF mixto'
        DESCONOCIDO = 'DESCONOCIDO', 'Sin determinar'

    documento = models.OneToOneField(
        Documento,
        on_delete=models.CASCADE,
        related_name='resultado_procesamiento',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.EN_COLA,
        db_index=True,
    )
    tipo_pdf = models.CharField(
        max_length=20,
        choices=TipoPdf.choices,
        default=TipoPdf.DESCONOCIDO,
    )
    tarea_id = models.CharField(max_length=255, blank=True, default='')
    numero_paginas = models.PositiveIntegerField(default=0)
    paginas_con_texto = models.PositiveIntegerField(default=0)
    paginas_con_ocr = models.PositiveIntegerField(default=0)
    requirio_ocr = models.BooleanField(default=False)
    ocr_aplicado = models.BooleanField(default=False)
    confianza_ocr = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    caracteres_extraidos = models.PositiveBigIntegerField(default=0)
    intentos = models.PositiveSmallIntegerField(default=0)
    iniciado_at = models.DateTimeField(null=True, blank=True)
    finalizado_at = models.DateTimeField(null=True, blank=True)
    duracion_ms = models.PositiveBigIntegerField(null=True, blank=True)
    error_codigo = models.CharField(max_length=60, blank=True, default='')
    error_mensaje = models.TextField(blank=True, default='')
    detalles_tecnicos = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        verbose_name = 'resultado de procesamiento'
        verbose_name_plural = 'resultados de procesamiento'

    def __str__(self):
        return f'{self.documento} - {self.get_estado_display()}'


class TextoPagina(models.Model):
    class Metodo(models.TextChoices):
        TEXTO_ORIGINAL = 'TEXTO_ORIGINAL', 'Texto original'
        OCR = 'OCR', 'OCR'

    resultado = models.ForeignKey(
        ResultadoProcesamiento,
        on_delete=models.CASCADE,
        related_name='paginas',
    )
    numero_pagina = models.PositiveIntegerField()
    metodo = models.CharField(max_length=20, choices=Metodo.choices)
    texto = models.TextField(blank=True, default='')
    caracteres = models.PositiveIntegerField(default=0)
    confianza_ocr = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('numero_pagina',)
        constraints = (
            models.UniqueConstraint(
                fields=('resultado', 'numero_pagina'),
                name='normativa_texto_pagina_unica',
            ),
        )
        verbose_name = 'texto de página'
        verbose_name_plural = 'textos de páginas'

    def __str__(self):
        return f'{self.resultado.documento} - página {self.numero_pagina}'


class PropuestaExtraccion(models.Model):
    class Estado(models.TextChoices):
        EN_COLA = 'EN_COLA', 'En cola'
        EXTRAYENDO = 'EXTRAYENDO', 'Extrayendo datos'
        COMPLETADA = 'COMPLETADA', 'Propuesta completada'
        ERROR = 'ERROR', 'Error'

    documento = models.OneToOneField(
        Documento,
        on_delete=models.CASCADE,
        related_name='propuesta_extraccion',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.EN_COLA,
        db_index=True,
    )
    tarea_id = models.CharField(max_length=255, blank=True, default='')
    tipo_norma_propuesto = models.ForeignKey(
        TipoNorma,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='propuestas_extraccion',
    )
    efecto_normativo_propuesto = models.ForeignKey(
        EfectoNormativo,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='propuestas_extraccion',
    )
    materia_propuesta = models.ForeignKey(
        Materia,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='propuestas_extraccion',
    )
    entidad_emisora_propuesta = models.ForeignKey(
        EntidadEmisora,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='propuestas_extraccion',
    )
    numero_propuesto = models.CharField(max_length=50, blank=True, default='')
    fecha_emision_propuesta = models.DateField(null=True, blank=True)
    titulo_propuesto = models.CharField(max_length=500, blank=True, default='')
    objeto_propuesto = models.TextField(blank=True, default='')
    confianza_global = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    intentos = models.PositiveSmallIntegerField(default=0)
    iniciado_at = models.DateTimeField(null=True, blank=True)
    finalizado_at = models.DateTimeField(null=True, blank=True)
    duracion_ms = models.PositiveBigIntegerField(null=True, blank=True)
    error_codigo = models.CharField(max_length=60, blank=True, default='')
    error_mensaje = models.TextField(blank=True, default='')
    detalles_tecnicos = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        verbose_name = 'propuesta de extracción jurídica'
        verbose_name_plural = 'propuestas de extracción jurídica'

    def __str__(self):
        return f'{self.documento} - {self.get_estado_display()}'


class EvidenciaExtraccion(models.Model):
    class Campo(models.TextChoices):
        TIPO_NORMA = 'TIPO_NORMA', 'Tipo de norma'
        NUMERO = 'NUMERO', 'Número'
        FECHA_EMISION = 'FECHA_EMISION', 'Fecha de emisión'
        TITULO = 'TITULO', 'Título'
        OBJETO = 'OBJETO', 'Objeto'
        EFECTO_NORMATIVO = 'EFECTO_NORMATIVO', 'Efecto normativo'
        MATERIA = 'MATERIA', 'Materia'
        ENTIDAD_EMISORA = 'ENTIDAD_EMISORA', 'Entidad emisora'

    propuesta = models.ForeignKey(
        PropuestaExtraccion,
        on_delete=models.CASCADE,
        related_name='evidencias',
    )
    campo = models.CharField(max_length=30, choices=Campo.choices)
    valor_propuesto = models.TextField(blank=True, default='')
    confianza = models.DecimalField(max_digits=5, decimal_places=2)
    numero_pagina = models.PositiveIntegerField(null=True, blank=True)
    fragmento = models.TextField(blank=True, default='')
    regla_aplicada = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('campo',)
        constraints = (
            models.UniqueConstraint(
                fields=('propuesta', 'campo'),
                name='normativa_evidencia_campo_unica',
            ),
        )
        verbose_name = 'evidencia de extracción'
        verbose_name_plural = 'evidencias de extracción'

    def __str__(self):
        return f'{self.propuesta.documento} - {self.get_campo_display()}'


class EvaluacionCalidad(models.Model):
    class Estado(models.TextChoices):
        EN_COLA = 'EN_COLA', 'En cola'
        ANALIZANDO = 'ANALIZANDO', 'Analizando'
        COMPLETADA = 'COMPLETADA', 'Completada'
        ERROR = 'ERROR', 'Error'

    class Resultado(models.TextChoices):
        SIN_ALERTAS_GRAVES = 'SIN_ALERTAS_GRAVES', 'Sin alertas graves'
        ALERTA_LEVE = 'ALERTA_LEVE', 'Alerta leve'
        ALERTA_GRAVE = 'ALERTA_GRAVE', 'Alerta grave'
        DUPLICADO_CONFIRMADO = 'DUPLICADO_CONFIRMADO', 'Duplicado confirmado'

    documento = models.OneToOneField(
        Documento,
        on_delete=models.CASCADE,
        related_name='evaluacion_calidad',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.EN_COLA,
        db_index=True,
    )
    resultado = models.CharField(
        max_length=30,
        choices=Resultado.choices,
        blank=True,
        default='',
        db_index=True,
    )
    tarea_id = models.CharField(max_length=255, blank=True, default='')
    documento_coincidente = models.ForeignKey(
        Documento,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='evaluaciones_coincidentes',
    )
    hash_contenido = models.CharField(max_length=64, blank=True, default='', db_index=True)
    puntuacion_calidad = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    total_alertas = models.PositiveIntegerField(default=0)
    alertas_leves = models.PositiveIntegerField(default=0)
    alertas_graves = models.PositiveIntegerField(default=0)
    intentos = models.PositiveSmallIntegerField(default=0)
    iniciado_at = models.DateTimeField(null=True, blank=True)
    finalizado_at = models.DateTimeField(null=True, blank=True)
    duracion_ms = models.PositiveBigIntegerField(null=True, blank=True)
    error_codigo = models.CharField(max_length=60, blank=True, default='')
    error_mensaje = models.TextField(blank=True, default='')
    metricas = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        verbose_name = 'evaluación de calidad'
        verbose_name_plural = 'evaluaciones de calidad'

    def __str__(self):
        return f'{self.documento} - {self.get_estado_display()}'


class CoincidenciaDocumento(models.Model):
    class Tipo(models.TextChoices):
        HASH_IDENTICO = 'HASH_IDENTICO', 'PDF idéntico'
        MISMA_NORMA = 'MISMA_NORMA', 'Misma norma'
        CONTENIDO_SIMILAR = 'CONTENIDO_SIMILAR', 'Contenido similar'
        IDENTIFICADOR_CONFLICTIVO = (
            'IDENTIFICADOR_CONFLICTIVO',
            'Identificador conflictivo',
        )

    evaluacion = models.ForeignKey(
        EvaluacionCalidad,
        on_delete=models.CASCADE,
        related_name='coincidencias',
    )
    documento_coincidente = models.ForeignKey(
        Documento,
        on_delete=models.PROTECT,
        related_name='coincidencias_detectadas',
    )
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    similitud_titulo = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    similitud_contenido = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    misma_fecha = models.BooleanField(default=False)
    mismo_identificador = models.BooleanField(default=False)
    detalles = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-similitud_contenido', '-similitud_titulo')
        constraints = (
            models.UniqueConstraint(
                fields=('evaluacion', 'documento_coincidente', 'tipo'),
                name='normativa_coincidencia_tipo_unica',
            ),
        )
        verbose_name = 'coincidencia documental'
        verbose_name_plural = 'coincidencias documentales'


class AlertaCalidad(models.Model):
    class Severidad(models.TextChoices):
        INFORMATIVA = 'INFORMATIVA', 'Informativa'
        LEVE = 'LEVE', 'Leve'
        GRAVE = 'GRAVE', 'Grave'

    class Estado(models.TextChoices):
        ACTIVA = 'ACTIVA', 'Activa'
        RESUELTA = 'RESUELTA', 'Resuelta'
        IGNORADA = 'IGNORADA', 'Ignorada'

    evaluacion = models.ForeignKey(
        EvaluacionCalidad,
        on_delete=models.CASCADE,
        related_name='alertas',
    )
    codigo = models.CharField(max_length=60)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    severidad = models.CharField(max_length=15, choices=Severidad.choices)
    estado = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.ACTIVA,
        db_index=True,
    )
    documento_relacionado = models.ForeignKey(
        Documento,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='alertas_relacionadas',
    )
    evidencia = models.JSONField(default=dict, blank=True)
    resuelta_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_calidad_resueltas',
    )
    resuelta_at = models.DateTimeField(null=True, blank=True)
    nota_resolucion = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-created_at',)
        constraints = (
            models.UniqueConstraint(
                fields=('evaluacion', 'codigo', 'documento_relacionado'),
                name='normativa_alerta_codigo_documento_unica',
            ),
        )
        verbose_name = 'alerta de calidad'
        verbose_name_plural = 'alertas de calidad'

    def __str__(self):
        return f'{self.evaluacion.documento} - {self.codigo}'


class RevisionJuridica(models.Model):
    class Estado(models.TextChoices):
        EN_CURSO = 'EN_CURSO', 'En curso'
        APROBADA = 'APROBADA', 'Aprobada'
        DEVUELTA = 'DEVUELTA', 'Devuelta con observaciones'

    documento = models.ForeignKey(
        Documento,
        on_delete=models.CASCADE,
        related_name='revisiones_juridicas',
    )
    numero_revision = models.PositiveSmallIntegerField(default=1)
    estado = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.EN_CURSO,
        db_index=True,
    )
    revisado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revisiones_juridicas',
    )
    observaciones = models.TextField(blank=True, default='')
    motivo_devolucion = models.TextField(blank=True, default='')
    ficha_anterior = models.JSONField(default=dict, blank=True)
    ficha_aprobada = models.JSONField(default=dict, blank=True)
    iniciada_at = models.DateTimeField(auto_now_add=True)
    finalizada_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-numero_revision', '-iniciada_at')
        constraints = (
            models.UniqueConstraint(
                fields=('documento', 'numero_revision'),
                name='normativa_revision_numero_unico',
            ),
            models.UniqueConstraint(
                fields=('documento',),
                condition=models.Q(estado='EN_CURSO'),
                name='normativa_una_revision_activa',
            ),
        )
        verbose_name = 'revisión jurídica'
        verbose_name_plural = 'revisiones jurídicas'

    def __str__(self):
        return f'{self.documento} - revisión {self.numero_revision}'


class CambioRevisionJuridica(models.Model):
    class OrigenValor(models.TextChoices):
        PROPUESTA = 'PROPUESTA', 'Propuesta automática'
        CORRECCION_MANUAL = 'CORRECCION_MANUAL', 'Corrección manual'
        SIN_CAMBIO = 'SIN_CAMBIO', 'Confirmado sin cambio'

    revision = models.ForeignKey(
        RevisionJuridica,
        on_delete=models.CASCADE,
        related_name='cambios',
    )
    campo = models.CharField(max_length=40)
    valor_anterior = models.TextField(blank=True, default='')
    valor_nuevo = models.TextField(blank=True, default='')
    origen_valor = models.CharField(max_length=20, choices=OrigenValor.choices)
    confianza_propuesta = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )
    evidencia = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('campo',)
        constraints = (
            models.UniqueConstraint(
                fields=('revision', 'campo'),
                name='normativa_cambio_revision_campo_unico',
            ),
        )
        verbose_name = 'cambio de revisión jurídica'
        verbose_name_plural = 'cambios de revisiones jurídicas'


class DecisionAlertaRevision(models.Model):
    class Decision(models.TextChoices):
        RESUELTA = 'RESUELTA', 'Resuelta'
        IGNORADA = 'IGNORADA', 'Ignorada justificadamente'

    revision = models.ForeignKey(
        RevisionJuridica,
        on_delete=models.CASCADE,
        related_name='decisiones_alertas',
    )
    alerta = models.ForeignKey(
        AlertaCalidad,
        on_delete=models.PROTECT,
        related_name='decisiones_revision',
    )
    decision = models.CharField(max_length=15, choices=Decision.choices)
    justificacion = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('alerta__severidad', 'alerta_id')
        constraints = (
            models.UniqueConstraint(
                fields=('revision', 'alerta'),
                name='normativa_decision_revision_alerta_unica',
            ),
        )
        verbose_name = 'decisión de alerta jurídica'
        verbose_name_plural = 'decisiones de alertas jurídicas'


class ResultadoConversion(models.Model):
    class Estado(models.TextChoices):
        EN_COLA = 'EN_COLA', 'En cola'
        CONVIRTIENDO = 'CONVIRTIENDO', 'Convirtiendo'
        COMPLETADA = 'COMPLETADA', 'Completada'
        ERROR = 'ERROR', 'Error'

    documento = models.OneToOneField(
        Documento,
        on_delete=models.CASCADE,
        related_name='resultado_conversion',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.EN_COLA,
        db_index=True,
    )
    tarea_id = models.CharField(max_length=255, blank=True, default='')
    nomenclatura_completa = models.TextField(blank=True, default='')
    nombre_archivo = models.CharField(max_length=500, blank=True, default='')
    carpeta_materia = models.CharField(max_length=200, blank=True, default='')
    archivo = models.FileField(
        storage=NormativaFinalStorage(),
        upload_to=archivo_final_path,
        max_length=1000,
        null=True,
        blank=True,
    )
    ruta_relativa = models.CharField(max_length=1000, blank=True, default='')
    hash_sha256 = models.CharField(max_length=64, blank=True, default='', db_index=True)
    tamano_bytes = models.PositiveBigIntegerField(default=0)
    version = models.PositiveSmallIntegerField(default=1)
    intentos = models.PositiveSmallIntegerField(default=0)
    iniciado_at = models.DateTimeField(null=True, blank=True)
    finalizado_at = models.DateTimeField(null=True, blank=True)
    duracion_ms = models.PositiveBigIntegerField(null=True, blank=True)
    error_codigo = models.CharField(max_length=60, blank=True, default='')
    error_mensaje = models.TextField(blank=True, default='')
    detalles_tecnicos = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-updated_at',)
        verbose_name = 'resultado de conversión final'
        verbose_name_plural = 'resultados de conversión final'

    def __str__(self):
        return f'{self.documento} - {self.get_estado_display()}'
