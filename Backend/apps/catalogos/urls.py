from rest_framework.routers import DefaultRouter

from .views import (
    EntidadEmisoraViewSet,
    EfectoNormativoViewSet,
    MateriaViewSet,
    PalabraClaveMateriaViewSet,
    PatronTipoNormaViewSet,
    ReglaEfectoNormativoViewSet,
    TipoNormaViewSet,
)

router = DefaultRouter()
router.register('tipos-norma', TipoNormaViewSet, basename='tipo-norma')
router.register(
    'efectos-normativos',
    EfectoNormativoViewSet,
    basename='efecto-normativo',
)
router.register('materias', MateriaViewSet, basename='materia')
router.register(
    'entidades-emisoras',
    EntidadEmisoraViewSet,
    basename='entidad-emisora',
)
# Alias temporal para clientes creados antes del endpoint definitivo.
router.register('entidades', EntidadEmisoraViewSet, basename='entidad')
router.register(
    'patrones-tipo-norma',
    PatronTipoNormaViewSet,
    basename='patron-tipo-norma',
)
router.register(
    'palabras-clave-materia',
    PalabraClaveMateriaViewSet,
    basename='palabra-clave-materia',
)
router.register(
    'reglas-efecto-normativo',
    ReglaEfectoNormativoViewSet,
    basename='regla-efecto-normativo',
)

urlpatterns = router.urls
