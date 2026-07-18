import uuid

from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.db import models


class Plan(models.Model):
    """Plan de suscripción del sistema (Módulo 3: Gestión de Pagos)."""

    class Codigo(models.TextChoices):
        GRATUITO = 'gratuito', 'Plan Gratuito'
        ESTUDIANTIL = 'estudiantil', 'Plan Estudiantil'
        PROFESIONAL = 'profesional', 'Plan Profesional'
        CONSULTORA = 'consultora', 'Plan Consultora'
        EMPRESARIAL = 'empresarial', 'Plan Empresarial'

    codigo = models.CharField(
        max_length=20,
        choices=Codigo.choices,
        unique=True,
    )
    nombre = models.CharField(max_length=80)
    descripcion = models.TextField(blank=True, default='')
    # Dispositivos habilitados por el plan (referencial en el Empresarial).
    dispositivos = models.PositiveSmallIntegerField(default=1)
    # Plan Empresarial: N dispositivos, costo variable (se cotiza por contacto).
    dispositivos_variables = models.BooleanField(default=False)
    # Lista de beneficios que se muestran en la tarjeta pública del plan.
    beneficios = models.JSONField(default=list, blank=True)
    destacado = models.BooleanField(default=False)
    orden = models.PositiveSmallIntegerField(default=0)
    activo = models.BooleanField(default=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['orden', 'id']
        verbose_name = 'plan'
        verbose_name_plural = 'planes'

    def __str__(self):
        return self.nombre


class PrecioPlan(models.Model):
    """Precio de un plan para una periodicidad (mensual/semestral/anual)."""

    class Periodicidad(models.TextChoices):
        MENSUAL = 'mensual', 'Mensual'
        SEMESTRAL = 'semestral', 'Semestral'
        ANUAL = 'anual', 'Anual'

    # Duración de la suscripción en meses calendario por periodicidad.
    MESES_POR_PERIODICIDAD = {
        Periodicidad.MENSUAL: 1,
        Periodicidad.SEMESTRAL: 6,
        Periodicidad.ANUAL: 12,
    }

    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name='precios',
    )
    periodicidad = models.CharField(
        max_length=12,
        choices=Periodicidad.choices,
    )
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['plan', 'periodicidad']
        constraints = [
            models.UniqueConstraint(
                fields=['plan', 'periodicidad'],
                name='unique_precio_plan_periodicidad',
            ),
        ]
        verbose_name = 'precio de plan'
        verbose_name_plural = 'precios de planes'

    def __str__(self):
        return f'{self.plan.nombre} — {self.get_periodicidad_display()}: Bs{self.precio}'


class Cliente(models.Model):
    """Cliente que se suscribe (Registro de Datos del Cliente, popup 1)."""

    class Genero(models.TextChoices):
        FEMENINO = 'femenino', 'Femenino'
        MASCULINO = 'masculino', 'Masculino'
        OTRO = 'otro', 'Otro'
        SIN_ESPECIFICAR = 'sin_especificar', 'Prefiero no decirlo'

    class Canal(models.TextChoices):
        INSTAGRAM = 'instagram', 'Instagram'
        FACEBOOK = 'facebook', 'Facebook'
        TIKTOK = 'tiktok', 'Tik-Tok'
        RADIO = 'radio', 'Radio'
        ASESOR = 'asesor', 'Asesor Empresarial'
        OTRO = 'otro', 'Otro'

    # Se enlaza al usuario del sistema cuando se habilita el acceso (Fase 3).
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='clientes_suscripcion',
    )
    nombre_completo = models.CharField(max_length=160)
    genero = models.CharField(max_length=20, choices=Genero.choices)
    fecha_nacimiento = models.DateField()
    whatsapp = models.CharField(max_length=20)
    email = models.EmailField(db_index=True)
    canal_contacto = models.CharField(
        max_length=20,
        choices=Canal.choices,
        help_text='Por qué medio se enteró del sistema Consultor Jurídico.',
    )
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'cliente'
        verbose_name_plural = 'clientes'

    def __str__(self):
        return f'{self.nombre_completo} <{self.email}>'


class DatosFacturacion(models.Model):
    """Datos de facturación del cliente (popup 2, opcional)."""

    class TipoDocumento(models.TextChoices):
        CI = 'ci', 'Cédula de Identidad'
        NIT = 'nit', 'NIT'

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name='datos_facturacion',
    )
    nombre_o_razon_social = models.CharField(max_length=160)
    tipo_documento = models.CharField(
        max_length=5,
        choices=TipoDocumento.choices,
    )
    numero_documento = models.CharField(max_length=20)
    complemento = models.CharField(max_length=5, blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'datos de facturación'
        verbose_name_plural = 'datos de facturación'

    def __str__(self):
        return (
            f'{self.nombre_o_razon_social} '
            f'({self.get_tipo_documento_display()} {self.numero_documento})'
        )


class Suscripcion(models.Model):
    """Suscripción de un cliente a un plan por una periodicidad."""

    class Estado(models.TextChoices):
        PENDIENTE_PAGO = 'pendiente_pago', 'Pendiente de pago'
        ACTIVA = 'activa', 'Activa'
        VENCIDA = 'vencida', 'Vencida'
        CANCELADA = 'cancelada', 'Cancelada'

    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,
        related_name='suscripciones',
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='suscripciones',
    )
    periodicidad = models.CharField(
        max_length=12,
        choices=PrecioPlan.Periodicidad.choices,
    )
    # Copia del precio al momento de la compra (el catálogo puede cambiar).
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    dispositivos = models.PositiveSmallIntegerField(default=1)
    datos_facturacion = models.ForeignKey(
        DatosFacturacion,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='suscripciones',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE_PAGO,
        db_index=True,
    )
    fecha_inicio = models.DateTimeField(null=True, blank=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)
    actualizado_en = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'suscripción'
        verbose_name_plural = 'suscripciones'

    def __str__(self):
        return (
            f'{self.cliente.nombre_completo} — {self.plan.nombre} '
            f'({self.get_periodicidad_display()}) [{self.get_estado_display()}]'
        )

    def activar(self, cuando):
        """Activa la suscripción calculando el vencimiento por periodicidad."""
        meses = PrecioPlan.MESES_POR_PERIODICIDAD[
            PrecioPlan.Periodicidad(self.periodicidad)
        ]
        self.estado = self.Estado.ACTIVA
        self.fecha_inicio = cuando
        self.fecha_fin = cuando + relativedelta(months=meses)


class CredencialAcceso(models.Model):
    """Usuario y contraseña habilitados por una suscripción (Habilitación III).

    Cada credencial habilita 1 SOLO dispositivo: queda vinculada al primer
    dispositivo que inicie sesión y ya no puede usarse en otro (regla
    IMPORTANTE del requerimiento). Solo un administrador puede desvincular.
    """

    class Estado(models.TextChoices):
        LIBRE = 'libre', 'Libre (pendiente del primer ingreso)'
        VINCULADA = 'vinculada', 'Vinculada a un dispositivo'
        BLOQUEADA = 'bloqueada', 'Bloqueada'

    suscripcion = models.ForeignKey(
        Suscripcion,
        on_delete=models.CASCADE,
        related_name='credenciales',
    )
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='credencial_acceso',
    )
    # Contraseña generada, visible para entregarla al cliente SOLO hasta el
    # primer inicio de sesión (al vincular el dispositivo se borra).
    password_inicial = models.CharField(max_length=40, blank=True, default='')
    estado = models.CharField(
        max_length=12,
        choices=Estado.choices,
        default=Estado.LIBRE,
        db_index=True,
    )
    # Identificador del dispositivo vinculado (emitido por el BFF como
    # cookie httpOnly en el primer inicio de sesión).
    device_id = models.UUIDField(null=True, blank=True)
    device_user_agent = models.CharField(
        max_length=300, blank=True, default=''
    )
    vinculada_en = models.DateTimeField(null=True, blank=True)
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['suscripcion', 'id']
        verbose_name = 'credencial de acceso'
        verbose_name_plural = 'credenciales de acceso'

    def __str__(self):
        return (
            f'{self.usuario.get_username()} — {self.get_estado_display()} '
            f'(suscripción {self.suscripcion_id})'
        )


class Pago(models.Model):
    """Pago de una suscripción a través de una pasarela (Libélula)."""

    class Metodo(models.TextChoices):
        LIBELULA = 'libelula', 'Libélula (QR, tarjeta, banca en línea)'

    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        PAGADO = 'pagado', 'Pagado'
        EXPIRADO = 'expirado', 'Expirado'
        ERROR = 'error', 'Error'

    suscripcion = models.ForeignKey(
        Suscripcion,
        on_delete=models.PROTECT,
        related_name='pagos',
    )
    metodo = models.CharField(
        max_length=20,
        choices=Metodo.choices,
        default=Metodo.LIBELULA,
    )
    # Identificador único de la deuda hacia Libélula (no adivinable).
    identificador = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    moneda = models.CharField(max_length=3, default='BOB')
    estado = models.CharField(
        max_length=12,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
        db_index=True,
    )
    # Identificador de la transacción devuelto por Libélula.
    id_transaccion = models.CharField(
        max_length=64,
        blank=True,
        default='',
        db_index=True,
    )
    url_pasarela = models.URLField(max_length=500, blank=True, default='')
    qr_simple_url = models.URLField(max_length=500, blank=True, default='')
    codigo_recaudacion = models.CharField(max_length=40, blank=True, default='')
    forma_pago = models.CharField(max_length=80, blank=True, default='')
    factura_numero = models.CharField(max_length=40, blank=True, default='')
    factura_url = models.URLField(max_length=500, blank=True, default='')
    # Respuesta completa de la verificación server-to-server (auditoría).
    confirmacion = models.JSONField(null=True, blank=True)
    error_detalle = models.TextField(blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)
    pagado_en = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-creado_en']
        verbose_name = 'pago'
        verbose_name_plural = 'pagos'

    def __str__(self):
        return (
            f'Pago {self.identificador} — Bs{self.monto} '
            f'[{self.get_estado_display()}]'
        )
