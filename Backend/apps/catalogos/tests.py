from io import StringIO

from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    EntidadEmisora,
    EfectoNormativo,
    Materia,
    PalabraClaveMateria,
    PatronTipoNorma,
    ReglaEfectoNormativo,
    TipoNorma,
)


@override_settings(DEBUG=True)
class CatalogosAPITests(APITestCase):
    def materia_payload(self, **overrides):
        payload = {
            'codigo': 'ENERGETICO',
            'nombre': 'Derecho Energético',
            'descripcion': 'Normativa del sector energético',
            'slug': 'derecho-energetico',
            'carpeta_destino': 'Derecho Energético',
            'color_etiqueta': '#f59e0b',
            'requiere_revision': True,
            'activo': True,
            'orden': 20,
        }
        payload.update(overrides)
        return payload

    def test_datos_iniciales_completos(self):
        self.assertGreaterEqual(TipoNorma.objects.count(), 15)
        self.assertGreaterEqual(EfectoNormativo.objects.count(), 3)
        self.assertGreaterEqual(Materia.objects.count(), 12)
        self.assertGreaterEqual(EntidadEmisora.objects.count(), 7)
        self.assertGreaterEqual(PatronTipoNorma.objects.count(), 2)
        self.assertGreaterEqual(PalabraClaveMateria.objects.count(), 3)
        self.assertGreaterEqual(ReglaEfectoNormativo.objects.count(), 4)

    def test_no_permite_tipo_norma_con_codigo_duplicado(self):
        respuesta = self.client.post(
            reverse('tipo-norma-list'),
            {
                'codigo': 'DS',
                'nombre': 'Otro Decreto Supremo',
                'abreviatura_archivo': 'DS',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('codigo', respuesta.data)

    def test_convierte_codigo_a_mayusculas(self):
        respuesta = self.client.post(
            reverse('materia-list'),
            self.materia_payload(codigo='energetico'),
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data['codigo'], 'ENERGETICO')

    def test_no_permite_punto_y_coma_en_codigo(self):
        respuesta = self.client.post(
            reverse('materia-list'),
            self.materia_payload(codigo='ENER;GETICO'),
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('codigo', respuesta.data)

    def test_no_permite_carpeta_insegura(self):
        for carpeta in ('Derecho/Tributario', '../Tributario', 'C:\\Normativa'):
            respuesta = self.client.post(
                reverse('materia-list'),
                self.materia_payload(carpeta_destino=carpeta),
                format='json',
            )
            self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn('carpeta_destino', respuesta.data)

    def test_delete_realiza_borrado_logico(self):
        materia = Materia.objects.get(codigo='AMBIENTAL')
        respuesta = self.client.delete(
            reverse('materia-detail', kwargs={'pk': materia.pk})
        )
        self.assertEqual(respuesta.status_code, status.HTTP_204_NO_CONTENT)
        materia.refresh_from_db()
        self.assertFalse(materia.activo)

    def test_filtro_activo_devuelve_solo_activos(self):
        Materia.objects.filter(codigo='AMBIENTAL').update(activo=False)
        respuesta = self.client.get(reverse('materia-list'), {'activo': 'true'})
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertTrue(respuesta.data['results'])
        self.assertTrue(all(item['activo'] for item in respuesta.data['results']))

    def test_busqueda_q_y_paginacion(self):
        respuesta = self.client.get(
            reverse('materia-list'),
            {'q': 'tributario', 'page': 1},
        )
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(respuesta.data['count'], 1)
        self.assertEqual(respuesta.data['results'][0]['codigo'], 'TRIBUTARIO')

    def test_seed_no_duplica_registros(self):
        call_command('seed_catalogos', stdout=StringIO())
        conteos_primera = (
            TipoNorma.objects.count(),
            EfectoNormativo.objects.count(),
            Materia.objects.count(),
            EntidadEmisora.objects.count(),
            PatronTipoNorma.objects.count(),
            PalabraClaveMateria.objects.count(),
            ReglaEfectoNormativo.objects.count(),
        )
        call_command('seed_catalogos', stdout=StringIO())
        conteos_segunda = (
            TipoNorma.objects.count(),
            EfectoNormativo.objects.count(),
            Materia.objects.count(),
            EntidadEmisora.objects.count(),
            PatronTipoNorma.objects.count(),
            PalabraClaveMateria.objects.count(),
            ReglaEfectoNormativo.objects.count(),
        )
        self.assertEqual(conteos_primera, conteos_segunda)

    def test_regex_invalido_devuelve_error(self):
        respuesta = self.client.post(
            reverse('patron-tipo-norma-list'),
            {
                'tipo_norma': TipoNorma.objects.get(codigo='L').pk,
                'patron_regex': '[regex-invalido',
                'ejemplo_texto': 'LEY 100',
                'prioridad': 1,
                'activo': True,
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('patron_regex', respuesta.data)

    def test_materia_no_permite_slug_duplicado(self):
        respuesta = self.client.post(
            reverse('materia-list'),
            self.materia_payload(slug='derecho-tributario'),
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('slug', respuesta.data)

    def test_acciones_activar_y_desactivar(self):
        materia = Materia.objects.get(codigo='AMBIENTAL')
        desactivar = self.client.post(
            reverse('materia-desactivar', kwargs={'pk': materia.pk})
        )
        activar = self.client.post(
            reverse('materia-activar', kwargs={'pk': materia.pk})
        )
        self.assertEqual(desactivar.status_code, status.HTTP_200_OK)
        self.assertFalse(desactivar.data['activo'])
        self.assertEqual(activar.status_code, status.HTTP_200_OK)
        self.assertTrue(activar.data['activo'])

    def test_efecto_solo_acepta_una_letra(self):
        respuesta = self.client.post(
            reverse('efecto-normativo-list'),
            {
                'codigo': 'XX',
                'nombre': 'Efecto inválido',
                'abreviatura_archivo': 'X',
            },
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('codigo', respuesta.data)
