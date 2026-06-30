from rest_framework.routers import DefaultRouter

from .views import (
    EntidadEmisoraViewSet,
    EfectoNormativoViewSet,
    MateriaViewSet,
    TipoNormaViewSet,
)

router = DefaultRouter()
router.register('materias', MateriaViewSet, basename='materia')
router.register('tipos-norma', TipoNormaViewSet, basename='tipo-norma')
router.register(
    'efectos-normativos',
    EfectoNormativoViewSet,
    basename='efecto-normativo',
)
router.register('entidades', EntidadEmisoraViewSet, basename='entidad')

urlpatterns = router.urls
