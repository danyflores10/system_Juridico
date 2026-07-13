import logging
import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Q, Sum
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.cuentas.permissions import EsAdministrador

from . import libelula, services
from .models import (
    Cliente,
    CredencialAcceso,
    DatosFacturacion,
    Pago,
    Plan,
    Suscripcion,
)
from .serializers import (
    CheckoutSerializer,
    PlanPublicoSerializer,
    SuscripcionAdminSerializer,
)

logger = logging.getLogger(__name__)


class PlanesPublicosView(APIView):
    """Catálogo público de planes y promociones (sección Planes)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        planes = (
            Plan.objects.filter(activo=True)
            .prefetch_related('precios')
            .order_by('orden', 'id')
        )
        return Response(PlanPublicoSerializer(planes, many=True).data)


class CheckoutView(APIView):
    """Crea la suscripción pendiente y registra la deuda en Libélula.

    Devuelve la URL de la pasarela a la que se debe redirigir al cliente.
    El precio SIEMPRE se resuelve en el servidor desde el catálogo (el
    cliente no puede manipular montos).
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'checkout'

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        plan = datos['plan_obj']
        precio = datos['precio_obj']
        info_cliente = datos['cliente']
        info_factura = datos.get('facturacion')

        email = info_cliente['email'].lower()
        datos_cliente = {
            'nombre_completo': info_cliente['nombre_completo'].strip(),
            'genero': info_cliente['genero'],
            'fecha_nacimiento': info_cliente['fecha_nacimiento'],
            'whatsapp': info_cliente['whatsapp'],
            'canal_contacto': info_cliente['canal_contacto'],
        }
        with transaction.atomic():
            # Reutiliza el cliente por email actualizando sus datos (se evita
            # update_or_create para tolerar posibles duplicados históricos).
            cliente = (
                Cliente.objects.filter(email=email).order_by('id').first()
            )
            if cliente is None:
                cliente = Cliente.objects.create(email=email, **datos_cliente)
            else:
                for campo, valor in datos_cliente.items():
                    setattr(cliente, campo, valor)
                cliente.save(
                    update_fields=[*datos_cliente.keys(), 'actualizado_en']
                )
            facturacion = None
            if info_factura:
                facturacion = DatosFacturacion.objects.create(
                    cliente=cliente,
                    nombre_o_razon_social=info_factura[
                        'nombre_o_razon_social'
                    ].strip(),
                    tipo_documento=info_factura['tipo_documento'],
                    numero_documento=info_factura['numero_documento'],
                    complemento=info_factura.get('complemento', ''),
                )
            suscripcion = Suscripcion.objects.create(
                cliente=cliente,
                plan=plan,
                periodicidad=precio.periodicidad,
                precio=precio.precio,
                dispositivos=plan.dispositivos,
                datos_facturacion=facturacion,
            )
            pago = Pago.objects.create(
                suscripcion=suscripcion,
                monto=precio.precio,
            )

        try:
            respuesta = libelula.registrar_deuda(pago, cliente, facturacion)
        except libelula.LibelulaError as exc:
            pago.estado = Pago.Estado.ERROR
            pago.error_detalle = str(exc)
            pago.save(update_fields=['estado', 'error_detalle'])
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        pago.id_transaccion = str(respuesta.get('id_transaccion') or '')[:64]
        pago.url_pasarela = str(respuesta.get('url_pasarela_pagos') or '')[:500]
        pago.qr_simple_url = str(respuesta.get('qr_simple_url') or '')[:500]
        pago.codigo_recaudacion = str(
            respuesta.get('codigo_recaudacion') or ''
        )[:40]
        pago.save(
            update_fields=[
                'id_transaccion',
                'url_pasarela',
                'qr_simple_url',
                'codigo_recaudacion',
            ]
        )

        return Response(
            {
                'identificador': str(pago.identificador),
                'url_pasarela_pagos': pago.url_pasarela,
                'qr_simple_url': pago.qr_simple_url or None,
                'monto': str(pago.monto),
                'moneda': pago.moneda,
                'plan': plan.nombre,
                'periodicidad': precio.periodicidad,
            },
            status=status.HTTP_201_CREATED,
        )


class SuscriptoresAdminView(generics.ListAPIView):
    """Listado de suscriptores para el panel (solo administradores)."""

    serializer_class = SuscripcionAdminSerializer
    permission_classes = [EsAdministrador]
    filterset_fields = {
        'estado': ['exact'],
        'plan__codigo': ['exact'],
        'periodicidad': ['exact'],
    }
    search_fields = [
        'cliente__nombre_completo',
        'cliente__email',
        'cliente__whatsapp',
    ]
    ordering_fields = ['creado_en', 'fecha_fin', 'precio']
    ordering = ['-creado_en']

    def get_queryset(self):
        return (
            Suscripcion.objects.select_related('cliente', 'plan')
            .prefetch_related('pagos')
            .annotate(
                credenciales_total=Count('credenciales', distinct=True),
                credenciales_vinculadas=Count(
                    'credenciales',
                    filter=Q(
                        credenciales__estado=(
                            CredencialAcceso.Estado.VINCULADA
                        )
                    ),
                    distinct=True,
                ),
            )
        )


class ResumenSuscriptoresView(APIView):
    """Métricas del módulo de Suscriptores (tarjetas superiores del panel)."""

    permission_classes = [EsAdministrador]

    def get(self, request):
        por_estado = dict(
            Suscripcion.objects.values_list('estado').annotate(
                total=Count('id')
            )
        )
        ingresos = Pago.objects.filter(estado=Pago.Estado.PAGADO).aggregate(
            total=Sum('monto')
        )['total'] or Decimal('0.00')
        return Response(
            {
                'clientes': Cliente.objects.count(),
                'activas': por_estado.get(Suscripcion.Estado.ACTIVA, 0),
                'pendientes': por_estado.get(
                    Suscripcion.Estado.PENDIENTE_PAGO, 0
                ),
                'vencidas': por_estado.get(Suscripcion.Estado.VENCIDA, 0)
                + por_estado.get(Suscripcion.Estado.CANCELADA, 0),
                'ingresos_cobrados': str(ingresos),
            }
        )


class LibelulaCallbackView(APIView):
    """PAGO EXITOSO: callback server-to-server que envía Libélula.

    Libélula hace GET/POST a esta URL al confirmarse el pago. No se confía
    en ningún parámetro recibido: se localiza el pago y se re-verifica
    contra la API de Libélula con el appkey privado antes de activar nada.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return self._procesar(request)

    def post(self, request):
        return self._procesar(request)

    def _procesar(self, request):
        pedido = request.query_params.get('pedido', '').strip()
        transaction_id = request.query_params.get(
            'transaction_id', ''
        ).strip()

        pago = None
        if pedido:
            try:
                pago = Pago.objects.filter(
                    identificador=uuid.UUID(pedido)
                ).first()
            except ValueError:
                pago = None
        if pago is None and transaction_id:
            pago = Pago.objects.filter(id_transaccion=transaction_id).first()

        if pago is None:
            logger.warning(
                'Callback Libélula sin pago asociado (pedido=%r, '
                'transaction_id=%r).',
                pedido,
                transaction_id,
            )
            return Response(
                {'error': 1, 'mensaje': 'Pago no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            services.confirmar_pago_verificado(pago.pk)
        except libelula.LibelulaError:
            # Libélula reintenta; además la página de retorno re-verifica.
            return Response(
                {'error': 1, 'mensaje': 'Verificación no disponible.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({'error': 0, 'mensaje': 'OK'})


class EstadoPagoView(APIView):
    """Estado de un pago para la página de retorno del cliente.

    Si el pago sigue pendiente se re-verifica contra Libélula, de modo que
    el flujo funciona aunque el callback no haya llegado (p. ej. en
    desarrollo, donde Libélula no alcanza localhost).
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'estado_pago'

    def get(self, request, identificador):
        pago = (
            Pago.objects.select_related('suscripcion__plan')
            .filter(identificador=identificador)
            .first()
        )
        if pago is None:
            return Response(
                {'detail': 'Pago no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if pago.estado == Pago.Estado.PENDIENTE and pago.id_transaccion:
            try:
                pago = services.confirmar_pago_verificado(pago.pk)
            except libelula.LibelulaError:
                pass  # se devuelve el estado local actual

        suscripcion = pago.suscripcion
        cliente = suscripcion.cliente
        facturacion = suscripcion.datos_facturacion
        # Datos para el comprobante de pago que se muestra al cliente.
        recibo = {
            'numero': pago.codigo_recaudacion or str(pago.identificador)[:8].upper(),
            'cliente': {
                'nombre_completo': cliente.nombre_completo,
                'email': cliente.email,
                'whatsapp': cliente.whatsapp,
            },
            'facturacion': (
                {
                    'nombre_o_razon_social': facturacion.nombre_o_razon_social,
                    'tipo_documento': facturacion.get_tipo_documento_display(),
                    'numero_documento': facturacion.numero_documento,
                    'complemento': facturacion.complemento,
                }
                if facturacion
                else None
            ),
        }
        # Credenciales habilitadas por el pago: se entregan al cliente SOLO
        # mientras no se haya hecho el primer inicio de sesión (después, la
        # contraseña inicial se borra y deja de mostrarse).
        credenciales = [
            {
                'usuario': credencial.usuario.get_username(),
                'password': credencial.password_inicial,
            }
            for credencial in suscripcion.credenciales.select_related(
                'usuario'
            ).order_by('id')
            if credencial.password_inicial
        ]
        return Response(
            {
                'identificador': str(pago.identificador),
                'estado': pago.estado,
                'monto': str(pago.monto),
                'moneda': pago.moneda,
                'forma_pago': pago.forma_pago,
                'pagado_en': pago.pagado_en,
                'factura_url': pago.factura_url or None,
                'url_pasarela_pagos': pago.url_pasarela or None,
                'plan': suscripcion.plan.nombre,
                'periodicidad': suscripcion.periodicidad,
                'recibo': recibo,
                'credenciales': credenciales,
                'suscripcion': {
                    'estado': suscripcion.estado,
                    'fecha_inicio': suscripcion.fecha_inicio,
                    'fecha_fin': suscripcion.fecha_fin,
                    'dispositivos': suscripcion.dispositivos,
                },
            }
        )
