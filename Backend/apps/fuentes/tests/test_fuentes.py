from unittest.mock import Mock, patch

import fitz
import httpx
from django.db import IntegrityError, transaction
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.fuentes.models import (
    EjecucionFuente,
    FuenteSeccion,
    FuenteWeb,
    HallazgoFuente,
)
from apps.fuentes.scraping import DescargaRemota, descubrir_enlaces
from apps.fuentes.services import ejecutar_descarga_fuente, probar_conexion_fuente
from apps.normativa.models import Documento, OrigenDocumento


@override_settings(DEBUG=True)
class FuentesTests(APITestCase):
    def crear_fuente(self, **overrides):
        values = {
            'codigo': 'PRUEBA',
            'nombre': 'Fuente de prueba',
            'url_base': 'https://example.com',
            'tipo_fuente': FuenteWeb.TipoFuente.PORTAL_WEB,
            'motor_consulta': FuenteWeb.MotorConsulta.HTTPX,
        }
        values.update(overrides)
        return FuenteWeb.objects.create(**values)

    @patch(
        'apps.fuentes.validators.socket.getaddrinfo',
        return_value=[(None, None, None, None, ('93.184.216.34', 443))],
    )
    def test_codigo_se_convierte_a_mayusculas_y_es_unico(self, getaddrinfo):
        payload = {
            'codigo': 'sin',
            'nombre': 'Servicio de Impuestos Nacionales',
            'url_base': 'https://example.com',
            'tipo_fuente': 'PORTAL_WEB',
            'motor_consulta': 'HTTPX',
            'frecuencia_consulta': 'MANUAL',
        }
        primera = self.client.post(reverse('fuente-list'), payload, format='json')
        segunda = self.client.post(
            reverse('fuente-list'),
            {**payload, 'nombre': 'Otra fuente'},
            format='json',
        )
        self.assertEqual(primera.status_code, status.HTTP_201_CREATED)
        self.assertEqual(primera.data['codigo'], 'SIN')
        self.assertEqual(segunda.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('codigo', segunda.data)

    def test_rechaza_localhost_cuando_no_esta_permitido(self):
        respuesta = self.client.post(
            reverse('fuente-list'),
            {
                'codigo': 'LOCAL',
                'nombre': 'Fuente local',
                'url_base': 'http://127.0.0.1:8000',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('url_base', respuesta.data)

    @override_settings(ALLOW_PRIVATE_SOURCE_URLS=True)
    def test_permite_url_privada_solo_con_configuracion_explicita(self):
        respuesta = self.client.post(
            reverse('fuente-list'),
            {
                'codigo': 'LOCAL',
                'nombre': 'Fuente local',
                'url_base': 'http://127.0.0.1:8000',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)

    def test_rechaza_url_que_no_sea_http_o_https(self):
        respuesta = self.client.post(
            reverse('fuente-list'),
            {
                'codigo': 'FTP',
                'nombre': 'Fuente FTP',
                'url_base': 'ftp://example.com/normas',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('url_base', respuesta.data)

    @patch(
        'apps.fuentes.validators.socket.getaddrinfo',
        return_value=[(None, None, None, None, ('93.184.216.34', 443))],
    )
    def test_abogado_crea_fuente_con_nombre_url_y_frecuencia(self, getaddrinfo):
        respuesta = self.client.post(
            reverse('fuente-list'),
            {
                'nombre': 'Servicio de Impuestos Nacionales',
                'url_consulta_principal': 'https://example.com/normativa',
                'frecuencia_consulta': 'DIARIA',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        fuente = FuenteWeb.objects.get()
        self.assertEqual(fuente.codigo, 'SIN')
        self.assertEqual(fuente.url_base, 'https://example.com')
        self.assertEqual(
            fuente.motor_consulta,
            FuenteWeb.MotorConsulta.HTTPX,
        )

    def test_delete_desactiva_fuente_y_seccion_sin_borrarlas(self):
        fuente = self.crear_fuente()
        seccion = FuenteSeccion.objects.create(
            fuente=fuente,
            codigo='LEYES',
            nombre='Leyes',
            url_listado='https://example.com/leyes',
        )
        respuesta_seccion = self.client.delete(
            reverse('fuente-seccion-detail', kwargs={'pk': seccion.pk})
        )
        respuesta_fuente = self.client.delete(
            reverse('fuente-detail', kwargs={'pk': fuente.pk})
        )
        fuente.refresh_from_db()
        seccion.refresh_from_db()
        self.assertEqual(respuesta_seccion.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(respuesta_fuente.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(fuente.activa)
        self.assertFalse(seccion.activa)

    def test_codigo_de_seccion_es_unico_dentro_de_cada_fuente(self):
        fuente = self.crear_fuente()
        FuenteSeccion.objects.create(
            fuente=fuente,
            codigo='RND',
            nombre='Resoluciones',
            url_listado='https://example.com/rnd',
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            FuenteSeccion.objects.create(
                fuente=fuente,
                codigo='RND',
                nombre='Resoluciones duplicadas',
                url_listado='https://example.com/rnd-2',
            )

    @patch('apps.fuentes.services._obtener_respuesta_segura')
    def test_prueba_exitosa_actualiza_fuente_y_crea_historial(self, obtener):
        response = Mock(status_code=200)
        response.raise_for_status.return_value = None
        obtener.return_value = response
        fuente = self.crear_fuente()

        resultado = probar_conexion_fuente(fuente)

        fuente.refresh_from_db()
        ejecucion = EjecucionFuente.objects.get(fuente=fuente)
        self.assertEqual(resultado['estado'], FuenteWeb.EstadoPrueba.DISPONIBLE)
        self.assertEqual(fuente.ultimo_estado_prueba, FuenteWeb.EstadoPrueba.DISPONIBLE)
        self.assertEqual(fuente.ultimo_codigo_http, 200)
        self.assertEqual(ejecucion.estado, EjecucionFuente.Estado.EXITOSA)

    @patch('apps.fuentes.services._obtener_respuesta_segura')
    def test_error_de_conexion_se_guarda_en_historial(self, obtener):
        request = httpx.Request('GET', 'https://example.com')
        obtener.side_effect = httpx.ConnectError('sin conexión', request=request)
        fuente = self.crear_fuente()

        resultado = probar_conexion_fuente(fuente)

        fuente.refresh_from_db()
        ejecucion = EjecucionFuente.objects.get(fuente=fuente)
        self.assertEqual(resultado['estado'], FuenteWeb.EstadoPrueba.ERROR)
        self.assertEqual(fuente.ultimo_estado_prueba, FuenteWeb.EstadoPrueba.ERROR)
        self.assertEqual(ejecucion.estado, EjecucionFuente.Estado.ERROR)
        self.assertIn('sin conexión', ejecucion.detalle_error)

    def test_listado_filtra_busca_y_pagina(self):
        self.crear_fuente(codigo='UNO', nombre='Portal tributario')
        self.crear_fuente(codigo='DOS', nombre='Portal aduanero', activa=False)
        respuesta = self.client.get(
            reverse('fuente-list'),
            {'q': 'tributario', 'activa': 'true', 'page': 1},
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['count'], 1)
        self.assertEqual(respuesta.data['results'][0]['codigo'], 'UNO')

    @patch('apps.fuentes.services._obtener_respuesta_segura')
    def test_playwright_prueba_disponibilidad_http(self, obtener):
        fuente = self.crear_fuente(
            motor_consulta=FuenteWeb.MotorConsulta.PLAYWRIGHT,
            requiere_javascript=True,
        )
        response = Mock(status_code=200)
        response.raise_for_status.return_value = None
        obtener.return_value = response
        resultado = probar_conexion_fuente(fuente)
        self.assertEqual(resultado['estado'], FuenteWeb.EstadoPrueba.DISPONIBLE)
        obtener.assert_called_once()

    def test_descubrimiento_generico_filtra_y_normaliza_enlaces_pdf(self):
        response = Mock()
        response.headers = {'content-type': 'text/html; charset=utf-8'}
        response.text = '''
            <a href="/docs/ley-1.pdf">Ley 1</a>
            <a href="/docs/ley-1.pdf#page=2">Repetido</a>
            <a href="/contacto">Contacto</a>
        '''
        enlaces = descubrir_enlaces(
            response,
            'https://example.com/normativa/',
        )
        self.assertEqual(len(enlaces), 1)
        self.assertEqual(enlaces[0].url, 'https://example.com/docs/ley-1.pdf')
        self.assertEqual(enlaces[0].titulo, 'Ley 1')

    @patch('apps.fuentes.services.encolar_procesamiento')
    @patch('apps.fuentes.services.descargar_pdf')
    @patch('apps.fuentes.services.obtener_listado')
    def test_ejecucion_descarga_pdf_y_lo_envia_al_flujo(
        self,
        obtener_listado,
        descargar,
        encolar,
    ):
        fuente = self.crear_fuente()
        response = Mock()
        response.status_code = 200
        response.url = 'https://example.com/normativa'
        response.headers = {'content-type': 'text/html'}
        response.text = '<a href="/ley.pdf">Ley tributaria</a>'
        obtener_listado.return_value = response
        descargar.return_value = DescargaRemota(
            contenido=self._pdf_valido(),
            url_final='https://example.com/ley.pdf',
            codigo_http=200,
            mime_type='application/pdf',
            nombre_archivo='ley.pdf',
        )
        ejecucion = EjecucionFuente.objects.create(
            fuente=fuente,
            tipo_ejecucion=EjecucionFuente.TipoEjecucion.EJECUCION_MANUAL,
            inicio=timezone.now(),
        )

        resultado = ejecutar_descarga_fuente(ejecucion.pk)

        documento = Documento.objects.get()
        hallazgo = HallazgoFuente.objects.get()
        self.assertEqual(resultado.estado, EjecucionFuente.Estado.EXITOSA)
        self.assertEqual(resultado.documentos_descargados, 1)
        self.assertEqual(documento.tipo_origen, Documento.TipoOrigen.DESCARGA_AUTOMATICA)
        self.assertEqual(hallazgo.estado, HallazgoFuente.Estado.DESCARGADO)
        self.assertEqual(hallazgo.documento, documento)
        self.assertTrue(OrigenDocumento.objects.filter(
            documento=documento,
            fuente=fuente,
            url_origen='https://example.com/ley.pdf',
        ).exists())
        encolar.assert_called_once_with(documento)

    @patch('apps.fuentes.services.descargar_pdf')
    @patch('apps.fuentes.services.obtener_listado')
    def test_url_ya_registrada_no_se_descarga_nuevamente(
        self,
        obtener_listado,
        descargar,
    ):
        fuente = self.crear_fuente()
        documento = Documento.objects.create(
            tipo_origen=Documento.TipoOrigen.DESCARGA_AUTOMATICA,
        )
        OrigenDocumento.objects.create(
            documento=documento,
            fuente=fuente,
            url_origen='https://example.com/ley.pdf',
        )
        response = Mock()
        response.status_code = 200
        response.url = 'https://example.com/'
        response.headers = {'content-type': 'text/html'}
        response.text = '<a href="/ley.pdf">Ley existente</a>'
        obtener_listado.return_value = response
        ejecucion = EjecucionFuente.objects.create(
            fuente=fuente,
            tipo_ejecucion=EjecucionFuente.TipoEjecucion.EJECUCION_MANUAL,
            inicio=timezone.now(),
        )

        resultado = ejecutar_descarga_fuente(ejecucion.pk)

        self.assertEqual(resultado.documentos_duplicados, 1)
        self.assertEqual(
            resultado.hallazgos.get().estado,
            HallazgoFuente.Estado.DUPLICADO,
        )
        descargar.assert_not_called()

    @staticmethod
    def _pdf_valido():
        document = fitz.open()
        page = document.new_page()
        page.insert_text((72, 72), 'LEY 123')
        content = document.tobytes()
        document.close()
        return content
