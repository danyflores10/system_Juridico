from django.urls import path

from . import views

urlpatterns = [
    path('resumen/', views.resumen, name='modificador-resumen'),
    path('leyes/', views.listar_leyes, name='modificador-leyes'),
    path('leyes/cargar/', views.cargar_leyes, name='modificador-leyes-cargar'),
    path(
        'leyes/<int:pk>/desactivar/',
        views.desactivar_ley,
        name='modificador-leyes-desactivar',
    ),
    path(
        'modificatorias/',
        views.listar_modificatorias,
        name='modificador-modificatorias',
    ),
    path(
        'modificatorias/cargar/',
        views.cargar_modificatorias,
        name='modificador-modificatorias-cargar',
    ),
    path(
        'modificatorias/<int:pk>/reintentar/',
        views.reintentar_vinculacion,
        name='modificador-modificatorias-reintentar',
    ),
    path(
        'modificatorias/<int:pk>/vincular/',
        views.vincular_manual,
        name='modificador-modificatorias-vincular',
    ),
    path('procesar/', views.procesar, name='modificador-procesar'),
    path('resultados/', views.listar_resultados, name='modificador-resultados'),
    path(
        'resultados/<int:pk>/',
        views.detalle_resultado,
        name='modificador-resultado-detalle',
    ),
    path(
        'resultados/<int:pk>/desactivar/',
        views.desactivar_resultado,
        name='modificador-resultado-desactivar',
    ),
    path(
        'resultados/<int:pk>/descargar/',
        views.descargar_resultado,
        name='modificador-resultado-descargar',
    ),
]
