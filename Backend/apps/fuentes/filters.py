import django_filters

from .models import EjecucionFuente, FuenteSeccion, FuenteWeb, HallazgoFuente


class FuenteWebFilter(django_filters.FilterSet):
    estado = django_filters.ChoiceFilter(
        field_name='ultimo_estado_prueba',
        choices=FuenteWeb.EstadoPrueba.choices,
    )

    class Meta:
        model = FuenteWeb
        fields = (
            'activa', 'tipo_fuente', 'motor_consulta',
            'materia_predeterminada',
        )


class FuenteSeccionFilter(django_filters.FilterSet):
    class Meta:
        model = FuenteSeccion
        fields = ('fuente', 'activa', 'materia_predeterminada')


class EjecucionFuenteFilter(django_filters.FilterSet):
    class Meta:
        model = EjecucionFuente
        fields = ('fuente', 'seccion', 'estado', 'tipo_ejecucion')


class HallazgoFuenteFilter(django_filters.FilterSet):
    class Meta:
        model = HallazgoFuente
        fields = ('ejecucion', 'fuente', 'seccion', 'documento', 'estado')
