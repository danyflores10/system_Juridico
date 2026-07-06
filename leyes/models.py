from django.db import models
from django.utils import timezone


class LeyOriginal(models.Model):
    """Norma base cargada en el sistema. Borrado lógico vía estado."""

    class Estado(models.TextChoices):
        ACTIVO = "activo", "Activo"
        INACTIVO = "inactivo", "Inactivo"
        ABROGADA = "abrogada", "Abrogada"

    class EstadoProceso(models.TextChoices):
        PENDIENTE = "pendiente", "Pendiente de Modificación"
        VINCULADA = "vinculada", "Modificación Vinculada"
        MODIFICADA = "modificada", "Modificada"

    codigo_ley = models.CharField("Código de ley", max_length=32, db_index=True)
    titulo = models.CharField("Título", max_length=500)
    contenido_completo = models.TextField("Contenido completo")
    archivo_origen = models.CharField("Archivo origen", max_length=255, blank=True)
    fecha_carga = models.DateTimeField("Fecha de carga", default=timezone.now)
    estado = models.CharField(
        max_length=16,
        choices=Estado.choices,
        default=Estado.ACTIVO,
        db_index=True,
    )
    estado_proceso = models.CharField(
        max_length=20,
        choices=EstadoProceso.choices,
        default=EstadoProceso.PENDIENTE,
    )

    class Meta:
        verbose_name = "Ley original"
        verbose_name_plural = "Leyes originales"
        ordering = ["codigo_ley"]
        constraints = [
            models.UniqueConstraint(
                fields=["codigo_ley"],
                condition=models.Q(estado="activo"),
                name="uniq_ley_activa_por_codigo",
            ),
        ]

    def __str__(self):
        return f"Ley {self.codigo_ley} — {self.titulo[:60]}"

    def marcar_inactiva(self):
        self.estado = self.Estado.INACTIVO
        self.save(update_fields=["estado"])

    def marcar_abrogada(self):
        self.estado = self.Estado.ABROGADA
        self.save(update_fields=["estado"])


class ModificacionDocumento(models.Model):
    """Documento modificatorio vinculado a una ley original."""

    class EstadoVinculacion(models.TextChoices):
        PENDIENTE = "pendiente", "Ley no vinculada"
        VINCULADA = "vinculada", "Vinculada — Lista para procesar"
        PROCESADO = "procesado", "Procesado exitosamente"

    ley_original = models.ForeignKey(
        LeyOriginal,
        on_delete=models.PROTECT,
        related_name="modificaciones",
        null=True,
        blank=True,
    )
    archivo_origen = models.CharField("Archivo origen", max_length=255)
    contenido = models.TextField("Contenido del documento")
    codigo_ley_detectado = models.CharField(
        "Código detectado", max_length=32, blank=True, db_index=True
    )
    palabras_clave_detectadas = models.CharField(
        "Palabras clave", max_length=255, blank=True
    )
    procesado = models.BooleanField(default=False, db_index=True)
    estado_vinculacion = models.CharField(
        max_length=20,
        choices=EstadoVinculacion.choices,
        default=EstadoVinculacion.PENDIENTE,
        db_index=True,
    )
    fecha_carga = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Modificación"
        verbose_name_plural = "Modificaciones"
        ordering = ["-fecha_carga"]

    def __str__(self):
        cod = self.codigo_ley_detectado or "sin código"
        return f"{self.archivo_origen} → Ley {cod}"

    def actualizar_estado_vinculacion(self):
        if self.procesado:
            nuevo = self.EstadoVinculacion.PROCESADO
        elif self.ley_original_id:
            nuevo = self.EstadoVinculacion.VINCULADA
        else:
            nuevo = self.EstadoVinculacion.PENDIENTE
        if self.estado_vinculacion != nuevo:
            self.estado_vinculacion = nuevo
            self.save(update_fields=["estado_vinculacion"])


class LeyResultado(models.Model):
    """Versión resultante tras aplicar modificaciones."""

    ley_original = models.ForeignKey(
        LeyOriginal,
        on_delete=models.PROTECT,
        related_name="resultados",
    )
    contenido_final = models.TextField("Contenido final")
    version = models.PositiveIntegerField(default=1)
    fecha_modificacion = models.DateTimeField(auto_now=True)
    es_version_final = models.BooleanField(
        "Versión final aprobada", default=False
    )
    activo = models.BooleanField(
        "Visible en procesos activos", default=True, db_index=True
    )
    notas = models.CharField(max_length=500, blank=True)
    preinforme = models.JSONField(
        "Pre-informe de auditoría",
        default=dict,
        blank=True,
    )

    class Meta:
        verbose_name = "Ley resultado"
        verbose_name_plural = "Leyes resultado"
        ordering = ["-fecha_modificacion"]
        unique_together = [["ley_original", "version"]]

    def __str__(self):
        return f"Ley {self.ley_original.codigo_ley} v{self.version}"
