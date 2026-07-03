from rest_framework.routers import DefaultRouter

from .views import DocumentoViewSet, HistorialDocumentoViewSet

router = DefaultRouter()
router.register('documentos', DocumentoViewSet, basename='documento')
router.register(
    'documentos-historial',
    HistorialDocumentoViewSet,
    basename='documento-historial',
)

urlpatterns = router.urls
