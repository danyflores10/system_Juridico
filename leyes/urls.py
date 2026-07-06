from django.urls import path
from . import views

urlpatterns = [
    path("", views.panel, name="panel"),
    path("resultado/<int:pk>/", views.detalle_resultado, name="detalle_resultado"),
    # Módulo 2 — Dashboard
    path("dashboard/", views.dashboard, name="dashboard"),
    path("api/dashboard-data/", views.api_dashboard_data, name="api_dashboard_data"),
    # Módulo 3 — Pre-documento
    path("predocumento/<int:pk>/", views.predocumento, name="predocumento"),
    path("api/predocumento/<int:pk>/", views.api_predocumento, name="api_predocumento"),
    # APIs existentes
    path("api/estado-panel/", views.api_estado_panel, name="api_estado_panel"),
    path("api/listar-leyes/", views.api_listar_leyes, name="api_listar_leyes"),
    path("api/cargar-leyes/", views.cargar_leyes, name="cargar_leyes"),
    path("api/cargar-modificaciones/", views.cargar_modificaciones, name="cargar_modificaciones"),
    path("api/reintentar-vinculacion/<int:pk>/", views.reintentar_vinculacion, name="reintentar_vinculacion"),
    path("api/vincular-manual/<int:pk>/", views.vincular_manual, name="vincular_manual"),
    path("api/procesar-modificaciones/", views.procesar_modificaciones, name="procesar_modificaciones"),
    path("api/guardar-version/<int:pk>/", views.guardar_version_final, name="guardar_version_final"),
    path("api/desactivar-ley/<int:pk>/", views.desactivar_ley, name="desactivar_ley"),
    path("api/desactivar-resultado/<int:pk>/", views.desactivar_resultado, name="desactivar_resultado"),
    path("api/descargar/<int:pk>/", views.descargar_resultado, name="descargar_resultado"),
]
