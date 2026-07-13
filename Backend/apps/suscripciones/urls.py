from django.urls import path

from .views import (
    CheckoutView,
    EstadoPagoView,
    LibelulaCallbackView,
    PlanesPublicosView,
    ResumenSuscriptoresView,
    SuscriptoresAdminView,
)

urlpatterns = [
    path('planes/', PlanesPublicosView.as_view(), name='planes-publicos'),
    path('checkout/', CheckoutView.as_view(), name='suscripcion-checkout'),
    path(
        'admin/suscripciones/',
        SuscriptoresAdminView.as_view(),
        name='suscriptores-admin',
    ),
    path(
        'admin/resumen/',
        ResumenSuscriptoresView.as_view(),
        name='suscriptores-resumen',
    ),
    path(
        'pagos/libelula/callback/',
        LibelulaCallbackView.as_view(),
        name='libelula-callback',
    ),
    path(
        'pagos/<uuid:identificador>/',
        EstadoPagoView.as_view(),
        name='estado-pago',
    ),
]
