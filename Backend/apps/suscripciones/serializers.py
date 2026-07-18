from django.utils import timezone
from rest_framework import serializers

from .models import Cliente, DatosFacturacion, Plan, PrecioPlan, Suscripcion


class PrecioPlanPublicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrecioPlan
        fields = ['periodicidad', 'precio']


class PlanPublicoSerializer(serializers.ModelSerializer):
    precios = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            'codigo',
            'nombre',
            'descripcion',
            'dispositivos',
            'dispositivos_variables',
            'beneficios',
            'destacado',
            'precios',
        ]

    def get_precios(self, plan):
        precios = [p for p in plan.precios.all() if p.activo]
        return PrecioPlanPublicoSerializer(precios, many=True).data


class ClienteResumenSerializer(serializers.ModelSerializer):
    canal_contacto_display = serializers.CharField(
        source='get_canal_contacto_display', read_only=True
    )

    class Meta:
        model = Cliente
        fields = [
            'nombre_completo',
            'email',
            'whatsapp',
            'canal_contacto',
            'canal_contacto_display',
        ]


class SuscripcionAdminSerializer(serializers.ModelSerializer):
    """Fila del módulo de Suscriptores del panel (solo administradores)."""

    cliente = ClienteResumenSerializer(read_only=True)
    plan = serializers.CharField(source='plan.nombre', read_only=True)
    plan_codigo = serializers.CharField(source='plan.codigo', read_only=True)
    credenciales_total = serializers.IntegerField(read_only=True)
    credenciales_vinculadas = serializers.IntegerField(read_only=True)
    ultimo_pago = serializers.SerializerMethodField()

    class Meta:
        model = Suscripcion
        fields = [
            'id',
            'cliente',
            'plan',
            'plan_codigo',
            'periodicidad',
            'precio',
            'estado',
            'dispositivos',
            'fecha_inicio',
            'fecha_fin',
            'creado_en',
            'credenciales_total',
            'credenciales_vinculadas',
            'ultimo_pago',
        ]

    def get_ultimo_pago(self, suscripcion):
        # `pagos` viene precargado y ordenado por -creado_en (Meta del modelo).
        pagos = list(suscripcion.pagos.all()[:1])
        if not pagos:
            return None
        pago = pagos[0]
        return {
            'estado': pago.estado,
            'metodo': pago.metodo,
            'forma_pago': pago.forma_pago,
            'monto': str(pago.monto),
            'pagado_en': pago.pagado_en,
            'creado_en': pago.creado_en,
        }


class ClienteCheckoutSerializer(serializers.Serializer):
    """Datos del cliente (ventana emergente 1 del requerimiento)."""

    nombre_completo = serializers.CharField(max_length=160, min_length=5)
    genero = serializers.ChoiceField(choices=Cliente.Genero.choices)
    fecha_nacimiento = serializers.DateField()
    whatsapp = serializers.RegexField(
        regex=r'^\+?\d{7,15}$',
        error_messages={
            'invalid': 'Ingresa un número de WhatsApp válido (solo dígitos).'
        },
    )
    email = serializers.EmailField()
    canal_contacto = serializers.ChoiceField(choices=Cliente.Canal.choices)

    def validate_fecha_nacimiento(self, valor):
        if valor >= timezone.localdate():
            raise serializers.ValidationError(
                'La fecha de nacimiento debe ser una fecha pasada.'
            )
        return valor


class FacturacionCheckoutSerializer(serializers.Serializer):
    """Datos de facturación (ventana emergente 2, opcional)."""

    nombre_o_razon_social = serializers.CharField(max_length=160, min_length=3)
    tipo_documento = serializers.ChoiceField(
        choices=DatosFacturacion.TipoDocumento.choices
    )
    numero_documento = serializers.RegexField(
        regex=r'^\d{4,15}$',
        error_messages={
            'invalid': 'El número de documento debe contener solo dígitos.'
        },
    )
    complemento = serializers.CharField(
        max_length=5, required=False, allow_blank=True, default=''
    )


class CheckoutSerializer(serializers.Serializer):
    """Solicitud de suscripción y pago (Elección del Plan y Facturación)."""

    plan = serializers.ChoiceField(choices=Plan.Codigo.choices)
    periodicidad = serializers.ChoiceField(
        choices=PrecioPlan.Periodicidad.choices
    )
    cliente = ClienteCheckoutSerializer()
    facturacion = FacturacionCheckoutSerializer(required=False, allow_null=True)

    def validate(self, attrs):
        try:
            plan = Plan.objects.get(codigo=attrs['plan'], activo=True)
        except Plan.DoesNotExist:
            raise serializers.ValidationError(
                {'plan': 'El plan seleccionado no está disponible.'}
            )
        if plan.dispositivos_variables:
            raise serializers.ValidationError(
                {
                    'plan': 'El Plan Empresarial se cotiza según el número de '
                    'dispositivos. Contáctanos por WhatsApp.'
                }
            )
        precio = plan.precios.filter(
            periodicidad=attrs['periodicidad'], activo=True
        ).first()
        if precio is None:
            raise serializers.ValidationError(
                {
                    'periodicidad': 'El plan no tiene esa periodicidad '
                    'disponible.'
                }
            )
        attrs['plan_obj'] = plan
        attrs['precio_obj'] = precio
        return attrs
