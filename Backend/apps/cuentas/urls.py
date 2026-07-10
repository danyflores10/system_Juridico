from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CambiarPasswordView,
    LoginView,
    MeView,
    PerfilPropioView,
    RefreshView,
    RegistroView,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/registro/', RegistroView.as_view(), name='auth-registro'),
    path('auth/refresh/', RefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/perfil/', PerfilPropioView.as_view(), name='auth-perfil'),
    path('auth/cambiar-password/', CambiarPasswordView.as_view(), name='auth-cambiar-password'),
    path('', include(router.urls)),
]
