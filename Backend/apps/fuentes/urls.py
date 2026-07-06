from rest_framework.routers import DefaultRouter

from .views import (
    EjecucionFuenteViewSet,
    FuenteSeccionViewSet,
    FuenteWebViewSet,
    HallazgoFuenteViewSet,
)

router = DefaultRouter()
router.register('fuentes', FuenteWebViewSet, basename='fuente')
router.register(
    'fuentes-secciones',
    FuenteSeccionViewSet,
    basename='fuente-seccion',
)
router.register(
    'fuentes-hallazgos',
    HallazgoFuenteViewSet,
    basename='fuente-hallazgo',
)
router.register(
    'fuentes-ejecuciones',
    EjecucionFuenteViewSet,
    basename='fuente-ejecucion',
)

urlpatterns = router.urls
