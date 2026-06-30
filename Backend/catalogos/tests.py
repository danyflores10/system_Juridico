from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import EntidadEmisora, EfectoNormativo, Materia, TipoNorma


class CatalogosAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        usuario_modelo = get_user_model()
        cls.usuario = usuario_modelo.objects.create_user(
            username='usuario',
            password='clave-segura-pruebas',
        )
        cls.administrador = usuario_modelo.objects.create_superuser(
            username='administrador',
            email='admin@example.com',
            password='clave-segura-pruebas',
        )

    def test_migracion_carga_los_catalogos_iniciales(self):
        self.assertEqual(Materia.objects.count(), 7)
        self.assertEqual(TipoNorma.objects.count(), 15)
        self.assertEqual(EfectoNormativo.objects.count(), 3)
        self.assertEqual(EntidadEmisora.objects.count(), 6)
        self.assertTrue(TipoNorma.objects.filter(codigo='DS').exists())

    def test_nombre_no_puede_repetirse_ignorando_mayusculas(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Materia.objects.create(
                codigo='TRIB-2',
                nombre='derecho tributario',
            )

    def test_listado_requiere_autenticacion(self):
        respuesta = self.client.get(reverse('materia-list'))
        self.assertIn(
            respuesta.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_usuario_autenticado_puede_listar(self):
        self.client.force_authenticate(self.usuario)
        respuesta = self.client.get(reverse('materia-list'))
        self.assertEqual(respuesta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(respuesta.data), 7)

    def test_usuario_no_administrador_no_puede_crear(self):
        self.client.force_authenticate(self.usuario)
        respuesta = self.client.post(
            reverse('materia-list'),
            {'codigo': 'COM', 'nombre': 'Derecho Comercial'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_403_FORBIDDEN)

    def test_administrador_puede_crear_y_codigo_se_normaliza(self):
        self.client.force_authenticate(self.administrador)
        respuesta = self.client.post(
            reverse('materia-list'),
            {'codigo': 'com', 'nombre': 'Derecho Comercial'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(respuesta.data['codigo'], 'COM')

    def test_api_rechaza_nombre_duplicado(self):
        self.client.force_authenticate(self.administrador)
        respuesta = self.client.post(
            reverse('materia-list'),
            {'codigo': 'OTRO', 'nombre': 'derecho tributario'},
            format='json',
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('nombre', respuesta.data)

    def test_no_se_permite_eliminacion_fisica(self):
        self.client.force_authenticate(self.administrador)
        materia = Materia.objects.get(codigo='TRIB')
        respuesta = self.client.delete(
            reverse('materia-detail', kwargs={'pk': materia.pk})
        )
        self.assertEqual(
            respuesta.status_code,
            status.HTTP_405_METHOD_NOT_ALLOWED,
        )
        self.assertTrue(Materia.objects.filter(pk=materia.pk).exists())

    def test_listado_muestra_activos_por_defecto_y_permite_todos(self):
        materia = Materia.objects.get(codigo='TRIB')
        materia.activo = False
        materia.save(update_fields=('activo', 'updated_at'))
        self.client.force_authenticate(self.usuario)

        respuesta_activos = self.client.get(reverse('materia-list'))
        codigos_activos = {item['codigo'] for item in respuesta_activos.data}
        self.assertNotIn('TRIB', codigos_activos)

        respuesta_todos = self.client.get(
            f"{reverse('materia-list')}?activo=todos"
        )
        codigos_todos = {item['codigo'] for item in respuesta_todos.data}
        self.assertIn('TRIB', codigos_todos)

    def test_filtro_activo_invalido_retorna_error(self):
        self.client.force_authenticate(self.usuario)
        respuesta = self.client.get(
            f"{reverse('materia-list')}?activo=valor-invalido"
        )
        self.assertEqual(respuesta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('activo', respuesta.data)

# Create your tests here.
