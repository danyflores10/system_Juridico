import django_filters

from .models import Documento, HistorialDocumento


class DocumentoFilter(django_filters.FilterSet):
    ESTADO_GRUPO_CHOICES = (
        ('BORRADOR', 'Borrador'),
        ('EN_PROCESO', 'En proceso'),
        ('NECESITA_REVISION', 'Necesita revisión'),
        ('NECESITA_ATENCION', 'Necesita atención'),
        ('PREPARANDO_FINAL', 'Preparando archivo final'),
        ('FINALIZADO', 'Finalizado'),
        ('DUPLICADO', 'Documento repetido'),
        ('DESCARTADO', 'Descartado'),
    )

    ESTADOS_POR_GRUPO = {
        'BORRADOR': (Documento.Estado.BORRADOR,),
        'EN_PROCESO': (
            Documento.Estado.PENDIENTE_PROCESAMIENTO,
            Documento.Estado.PROCESANDO,
            Documento.Estado.PENDIENTE_EXTRACCION,
            Documento.Estado.CONTROL_CALIDAD,
        ),
        'NECESITA_REVISION': (
            Documento.Estado.PENDIENTE_REVISION,
            Documento.Estado.PENDIENTE_APROBACION,
            Documento.Estado.PENDIENTE_REVISION_RAPIDA,
            Documento.Estado.OBSERVADO,
        ),
        'NECESITA_ATENCION': (
            Documento.Estado.ERROR,
            Documento.Estado.ERROR_CONVERSION,
        ),
        'PREPARANDO_FINAL': (
            Documento.Estado.LISTO_PARA_CONVERSION,
            Documento.Estado.CONVIRTIENDO,
        ),
        'FINALIZADO': (
            Documento.Estado.FINALIZADO,
            Documento.Estado.VALIDADO,
        ),
        'DUPLICADO': (Documento.Estado.DUPLICADO_CONFIRMADO,),
        'DESCARTADO': (Documento.Estado.DESCARTADO,),
    }

    estado_grupo = django_filters.ChoiceFilter(
        choices=ESTADO_GRUPO_CHOICES,
        method='filter_estado_grupo',
    )
    fecha_desde = django_filters.DateFilter(field_name='fecha_recepcion__date', lookup_expr='gte')
    fecha_hasta = django_filters.DateFilter(field_name='fecha_recepcion__date', lookup_expr='lte')
    fecha_final_desde = django_filters.DateFilter(
        field_name='resultado_conversion__finalizado_at__date',
        lookup_expr='gte',
    )
    fecha_final_hasta = django_filters.DateFilter(
        field_name='resultado_conversion__finalizado_at__date',
        lookup_expr='lte',
    )

    def filter_estado_grupo(self, queryset, _name, value):
        if not value:
            return queryset
        return queryset.filter(estado__in=self.ESTADOS_POR_GRUPO[value])

    class Meta:
        model = Documento
        fields = (
            'estado', 'tipo_origen', 'materia', 'tipo_norma',
        )


class HistorialDocumentoFilter(django_filters.FilterSet):
    documento = django_filters.UUIDFilter(field_name='documento__uuid')

    class Meta:
        model = HistorialDocumento
        fields = ('documento', 'accion', 'usuario')
