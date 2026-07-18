import shutil
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import Mock, patch

import fitz
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.normativa.models import (
    ArchivoDocumento,
    Documento,
    HistorialDocumento,
    EvidenciaExtraccion,
    PropuestaExtraccion,
    AlertaCalidad,
    EvaluacionCalidad,
    ResultadoConversion,
    ResultadoProcesamiento,
    TextoPagina,
    RevisionJuridica,
    CambioRevisionJuridica,
)
from apps.normativa.processing import ErrorProcesamiento, _analizar_pdf, procesar_documento
from apps.normativa.extraction import ErrorExtraccion, extraer_datos_juridicos
from apps.normativa.quality import evaluar_calidad_documento
from apps.normativa.conversion import ErrorConversion, convertir_documento_final
from apps.normativa.tasks import convertir_documento_final_task


TEMP_MEDIA_ROOT = tempfile.mkdtemp(prefix='normativa-tests-')
TEMP_FINAL_ROOT = tempfile.mkdtemp(prefix='normativa-final-tests-')


def tearDownModule():
    shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)
    shutil.rmtree(TEMP_FINAL_ROOT, ignore_errors=True)


def crear_pdf(nombre='norma.pdf'):
    document = fitz.open()
    document.new_page()
    content = document.tobytes()
    document.close()
    return SimpleUploadedFile(nombre, content, content_type='application/pdf')


def crear_pdf_texto(nombre='norma-texto.pdf'):
    document = fitz.open()
    page = document.new_page()
    page.insert_text(
        (72, 72),
        'LEY 2492 CODIGO TRIBUTARIO BOLIVIANO CON TEXTO SELECCIONABLE',
    )
    content = document.tobytes()
    document.close()
    return SimpleUploadedFile(nombre, content, content_type='application/pdf')


def crear_pdf_juridico(nombre='ley-2492.pdf', efecto=''):
    texto = f'''LEY NRO. 2492
LEY DE 2 DE AGOSTO DE 2003
CODIGO TRIBUTARIO BOLIVIANO
ASAMBLEA LEGISLATIVA PLURINACIONAL

ARTICULO 1. La presente Ley tiene por objeto regular los tributos,
los impuestos nacionales y las obligaciones tributarias en Bolivia.

ARTICULO 2. Ambito de aplicacion de la presente norma.
{efecto}
'''
    document = fitz.open()
    page = document.new_page()
    page.insert_textbox(fitz.Rect(60, 60, 550, 780), texto, fontsize=12)
    content = document.tobytes()
    document.close()
    return SimpleUploadedFile(nombre, content, content_type='application/pdf')


@override_settings(
    DEBUG=True,
    MEDIA_ROOT=TEMP_MEDIA_ROOT,
    FINAL_NORMATIVA_ROOT=TEMP_FINAL_ROOT,
    MAX_PDF_UPLOAD_SIZE=100 * 1024 * 1024,
)
class DocumentosNormativosTests(APITestCase):
    def cargar(self, archivo=None):
        response = self.client.post(reverse('documento-upload'), {'archivo': archivo or crear_pdf()}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return Documento.objects.get(uuid=response.data['uuid']), response

    def preparar_para_conversion(self, archivo=None):
        documento, _ = self.cargar(archivo or crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        evaluar_calidad_documento(documento.pk)
        documento.refresh_from_db()
        documento.tipo_norma = propuesta.tipo_norma_propuesto
        documento.efecto_normativo = propuesta.efecto_normativo_propuesto
        documento.materia = propuesta.materia_propuesta
        documento.entidad_emisora = propuesta.entidad_emisora_propuesta
        documento.numero = propuesta.numero_propuesto
        documento.fecha_emision = propuesta.fecha_emision_propuesta
        documento.titulo = propuesta.titulo_propuesto
        documento.objeto = propuesta.objeto_propuesto
        documento.titulo_archivo = 'Código Tributario'
        documento.objeto_resumido = 'Sistema Tributario Boliviano'
        documento.estado = Documento.Estado.LISTO_PARA_CONVERSION
        documento.save()
        return documento

    def test_upload_solo_pdf_crea_registro_pendiente(self):
        documento, response = self.cargar()
        archivo = documento.archivos.get(tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL)
        self.assertEqual(documento.estado, Documento.Estado.PENDIENTE_PROCESAMIENTO)
        self.assertEqual(documento.tipo_origen, Documento.TipoOrigen.CARGA_MANUAL)
        self.assertEqual(documento.codigo_interno, f'DOC-{documento.pk:06d}')
        self.assertIsNone(documento.tipo_norma)
        self.assertEqual(len(archivo.hash_sha256), 64)
        self.assertTrue(archivo.archivo.name.startswith('entrada/'))
        self.assertTrue(response.data['archivo_original_url'].endswith('/archivo/'))

    def test_rechaza_extension_incorrecta(self):
        response = self.client.post(reverse('documento-upload'), {'archivo': SimpleUploadedFile('norma.txt', b'texto')}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rechaza_pdf_falso(self):
        response = self.client.post(reverse('documento-upload'), {'archivo': SimpleUploadedFile('falso.pdf', b'%PDF-no-valido', content_type='application/pdf')}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_permite_archivos_repetidos_y_guarda_hash(self):
        pdf = crear_pdf().read()
        first, _ = self.cargar(SimpleUploadedFile('uno.pdf', pdf, content_type='application/pdf'))
        second, _ = self.cargar(SimpleUploadedFile('dos.pdf', pdf, content_type='application/pdf'))
        self.assertEqual(first.archivos.get().hash_sha256, second.archivos.get().hash_sha256)

    def test_archivo_devuelve_pdf(self):
        documento, _ = self.cargar()
        response = self.client.get(reverse('documento-archivo', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertNotIn('X-Frame-Options', response)

    def test_descartar_es_borrado_logico(self):
        documento, _ = self.cargar()
        response = self.client.post(reverse('documento-descartar', kwargs={'uuid': documento.uuid}))
        documento.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(documento.estado, Documento.Estado.DESCARTADO)
        self.assertTrue(documento.historial.filter(accion=HistorialDocumento.Accion.DESCARTADO).exists())

    def test_listado_busca_nombre_de_archivo(self):
        documento, _ = self.cargar(crear_pdf('ley-2492.pdf'))
        response = self.client.get(reverse('documento-list'), {'q': '2492'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['uuid'], str(documento.uuid))

    def test_listado_expone_y_ordena_por_fecha_finalizacion(self):
        antiguo, _ = self.cargar(crear_pdf('antiguo.pdf'))
        reciente, _ = self.cargar(crear_pdf('reciente.pdf'))
        ahora = timezone.now()
        ResultadoConversion.objects.create(
            documento=antiguo,
            estado=ResultadoConversion.Estado.COMPLETADA,
            finalizado_at=ahora - timedelta(hours=2),
        )
        ResultadoConversion.objects.create(
            documento=reciente,
            estado=ResultadoConversion.Estado.COMPLETADA,
            finalizado_at=ahora,
        )

        response = self.client.get(
            reverse('documento-list'),
            {'ordering': '-fecha_finalizacion'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['uuid'], str(reciente.uuid))
        self.assertIsNotNone(response.data['results'][0]['fecha_finalizacion'])

    def test_listado_filtra_por_grupo_de_estado(self):
        pendiente, _ = self.cargar(crear_pdf('pendiente.pdf'))
        observado, _ = self.cargar(crear_pdf('observado.pdf'))
        finalizado, _ = self.cargar(crear_pdf('finalizado.pdf'))
        Documento.objects.filter(pk=pendiente.pk).update(
            estado=Documento.Estado.PENDIENTE_REVISION,
        )
        Documento.objects.filter(pk=observado.pk).update(
            estado=Documento.Estado.OBSERVADO,
        )
        Documento.objects.filter(pk=finalizado.pk).update(
            estado=Documento.Estado.FINALIZADO,
        )

        response = self.client.get(
            reverse('documento-list'),
            {'estado_grupo': 'NECESITA_REVISION'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        uuids = {item['uuid'] for item in response.data['results']}
        self.assertEqual(uuids, {str(pendiente.uuid), str(observado.uuid)})

    def test_archivo_finalizado_expone_ficha_y_descargas(self):
        documento = self.preparar_para_conversion()
        documento.numero = '987654'
        documento.titulo_archivo = 'Norma para archivo jurídico final'
        documento.objeto_resumido = 'Consulta independiente del documento final'
        documento.save()
        convertir_documento_final(documento.pk)

        response = self.client.get(
            reverse('documento-archivo-finalizado'),
            {'q': 'Tributario', 'materia': documento.materia_id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        item = response.data['results'][0]
        self.assertEqual(item['uuid'], str(documento.uuid))
        self.assertEqual(item['materia']['id'], documento.materia_id)
        self.assertEqual(item['tipo_norma']['id'], documento.tipo_norma_id)
        self.assertTrue(item['conversion']['archivo_url'].endswith('/archivo-word/'))
        self.assertTrue(
            item['conversion']['archivo_pdf_url'].endswith(
                '/archivo-pdf-consulta/'
            )
        )
        self.assertTrue(item['conversion']['pdf_texto_buscable'])

        opciones = self.client.get(
            reverse('documento-archivo-finalizado-opciones')
        )
        self.assertEqual(opciones.status_code, status.HTTP_200_OK)
        self.assertEqual(opciones.data['materias'][0]['id'], documento.materia_id)
        self.assertEqual(
            opciones.data['tipos_norma'][0]['id'],
            documento.tipo_norma_id,
        )

    def test_procesa_pdf_con_texto_sin_ocr(self):
        documento, _ = self.cargar(crear_pdf_texto())
        resultado = procesar_documento(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, Documento.Estado.PENDIENTE_EXTRACCION)
        self.assertEqual(resultado.estado, ResultadoProcesamiento.Estado.COMPLETADO)
        self.assertEqual(resultado.tipo_pdf, ResultadoProcesamiento.TipoPdf.TEXTO)
        self.assertFalse(resultado.requirio_ocr)
        self.assertEqual(resultado.numero_paginas, 1)
        self.assertIn('LEY 2492', resultado.paginas.get().texto)
        self.assertEqual(resultado.paginas.get().metodo, TextoPagina.Metodo.TEXTO_ORIGINAL)
        self.assertTrue(documento.archivos.filter(tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_PROCESADO).exists())

    def test_pdf_con_imagen_completa_y_texto_ocr_se_detecta_como_escaneado(self):
        with tempfile.TemporaryDirectory() as temporal:
            ruta = f'{temporal}/ocr-existente.pdf'
            pdf = fitz.open()
            pagina = pdf.new_page()
            pixmap = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 20, 20), False)
            pixmap.clear_with(255)
            pagina.insert_image(pagina.rect, pixmap=pixmap)
            pagina.insert_text(
                (72, 72),
                'TEXTO OCR SELECCIONABLE EN UNA PAGINA QUE SIGUE SIENDO ESCANEADA',
            )
            pdf.save(ruta)
            pdf.close()

            _, paginas_texto, tipo_pdf = _analizar_pdf(ruta)

        self.assertEqual(paginas_texto, [False])
        self.assertEqual(tipo_pdf, ResultadoProcesamiento.TipoPdf.ESCANEADO)

    @patch('apps.normativa.processing._confianza_pagina', return_value=91.5)
    @patch('apps.normativa.processing._ejecutar_ocr')
    def test_pdf_escaneado_aplica_ocr_y_guarda_confianza(self, ejecutar_ocr, _confianza):
        def crear_salida(_entrada, salida):
            pdf = fitz.open()
            pagina = pdf.new_page()
            pagina.insert_text((72, 72), 'TEXTO RECONOCIDO POR OCR EN DOCUMENTO ESCANEADO')
            pdf.save(salida)
            pdf.close()
            return {'codigo_salida': 0}

        ejecutar_ocr.side_effect = crear_salida
        documento, _ = self.cargar()
        resultado = procesar_documento(documento.pk)
        self.assertEqual(resultado.tipo_pdf, ResultadoProcesamiento.TipoPdf.ESCANEADO)
        self.assertTrue(resultado.ocr_aplicado)
        self.assertEqual(float(resultado.confianza_ocr), 91.5)
        self.assertEqual(resultado.paginas.get().metodo, TextoPagina.Metodo.OCR)

    @patch('apps.normativa.processing._ejecutar_ocr')
    def test_error_ocr_se_registra_sin_eliminar_original(self, ejecutar_ocr):
        ejecutar_ocr.side_effect = ErrorProcesamiento('OCR_FALLIDO', 'Fallo controlado.')
        documento, _ = self.cargar()
        with self.assertRaises(ErrorProcesamiento):
            procesar_documento(documento.pk)
        documento.refresh_from_db()
        resultado = documento.resultado_procesamiento
        self.assertEqual(documento.estado, Documento.Estado.ERROR)
        self.assertEqual(resultado.error_codigo, 'OCR_FALLIDO')
        self.assertTrue(documento.archivos.filter(tipo_archivo=ArchivoDocumento.TipoArchivo.PDF_ORIGINAL).exists())

    @patch('apps.normativa.tasks.procesar_documento_task.delay')
    def test_endpoint_procesar_encola_tarea_celery(self, delay):
        delay.return_value = Mock(id='task-123')
        documento, _ = self.cargar(crear_pdf_texto())
        response = self.client.post(reverse('documento-procesar', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['estado'], ResultadoProcesamiento.Estado.EN_COLA)
        self.assertEqual(response.data['tarea_id'], 'task-123')

    def test_resultado_procesamiento_expone_texto_por_pagina(self):
        documento, _ = self.cargar(crear_pdf_texto())
        procesar_documento(documento.pk)
        response = self.client.get(reverse('documento-resultado-procesamiento', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['numero_paginas'], 1)
        self.assertIn('LEY 2492', response.data['paginas'][0]['texto'])
        self.assertTrue(response.data['archivo_procesado_url'].endswith('/archivo-procesado/'))
        archivo = self.client.get(
            reverse('documento-archivo-procesado', kwargs={'uuid': documento.uuid})
        )
        self.assertEqual(archivo.status_code, status.HTTP_200_OK)
        self.assertNotIn('X-Frame-Options', archivo)

    def test_extraccion_genera_propuesta_separada_con_evidencias(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, Documento.Estado.PENDIENTE_REVISION)
        self.assertEqual(propuesta.estado, PropuestaExtraccion.Estado.COMPLETADA)
        self.assertEqual(propuesta.tipo_norma_propuesto.codigo, 'L')
        self.assertEqual(propuesta.numero_propuesto, '2492')
        self.assertEqual(propuesta.fecha_emision_propuesta.isoformat(), '2003-08-02')
        self.assertIn('Tributario', propuesta.titulo_propuesto)
        self.assertIn('tiene por objeto', propuesta.objeto_propuesto)
        self.assertEqual(propuesta.efecto_normativo_propuesto.codigo, 'O')
        self.assertEqual(propuesta.materia_propuesta.codigo, 'TRIBUTARIO')
        self.assertEqual(propuesta.entidad_emisora_propuesta.codigo, 'ALP')
        self.assertGreaterEqual(propuesta.evidencias.count(), 7)
        self.assertIsNone(documento.tipo_norma)
        self.assertEqual(documento.numero, '')

    def test_extraccion_detecta_efecto_derogatorio(self):
        documento, _ = self.cargar(crear_pdf_juridico(efecto='DEROGA todas las disposiciones contrarias.'))
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        self.assertEqual(propuesta.efecto_normativo_propuesto.codigo, 'D')
        evidencia = propuesta.evidencias.get(campo=EvidenciaExtraccion.Campo.EFECTO_NORMATIVO)
        self.assertIn('DEROGA', evidencia.regla_aplicada)

    @patch('apps.normativa.tasks.extraer_datos_juridicos_task.delay')
    def test_endpoint_extraccion_encola_celery(self, delay):
        delay.return_value = Mock(id='extract-123')
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        response = self.client.post(reverse('documento-extraer-datos', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['estado'], PropuestaExtraccion.Estado.EN_COLA)
        self.assertEqual(response.data['tarea_id'], 'extract-123')

    def test_api_propuesta_incluye_confianza_fragmentos_y_reglas(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        extraer_datos_juridicos(documento.pk)
        response = self.client.get(reverse('documento-propuesta-extraccion', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['tipo_norma_propuesto']['codigo'], 'L')
        self.assertGreater(len(response.data['evidencias']), 0)
        self.assertTrue(response.data['evidencias'][0]['regla_aplicada'])

    def test_extraccion_rechaza_documento_sin_procesamiento(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        with self.assertRaises(ErrorExtraccion) as contexto:
            extraer_datos_juridicos(documento.pk)
        self.assertEqual(contexto.exception.codigo, 'ESTADO_INVALIDO')

    def test_control_calidad_documento_limpio_queda_listo(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        extraer_datos_juridicos(documento.pk)
        evaluacion = evaluar_calidad_documento(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(evaluacion.estado, EvaluacionCalidad.Estado.COMPLETADA)
        self.assertEqual(evaluacion.resultado, EvaluacionCalidad.Resultado.SIN_ALERTAS_GRAVES)
        self.assertEqual(documento.estado, Documento.Estado.PENDIENTE_APROBACION)
        self.assertEqual(evaluacion.alertas_graves, 0)

    def test_hash_identico_confirma_duplicado_y_vincula_canonico(self):
        contenido = crear_pdf_juridico().read()
        primero, _ = self.cargar(SimpleUploadedFile('primero.pdf', contenido, content_type='application/pdf'))
        procesar_documento(primero.pk)
        extraer_datos_juridicos(primero.pk)
        evaluar_calidad_documento(primero.pk)
        segundo, _ = self.cargar(SimpleUploadedFile('segundo.pdf', contenido, content_type='application/pdf'))
        procesar_documento(segundo.pk)
        extraer_datos_juridicos(segundo.pk)
        evaluacion = evaluar_calidad_documento(segundo.pk)
        segundo.refresh_from_db()
        self.assertEqual(evaluacion.resultado, EvaluacionCalidad.Resultado.DUPLICADO_CONFIRMADO)
        self.assertEqual(segundo.estado, Documento.Estado.DUPLICADO_CONFIRMADO)
        self.assertEqual(segundo.documento_canonico, primero)
        self.assertTrue(evaluacion.alertas.filter(codigo='PDF_IDENTICO').exists())

    def test_misma_norma_con_pdf_distinto_detecta_otro_origen(self):
        primero, _ = self.cargar(crear_pdf_juridico('version-uno.pdf'))
        procesar_documento(primero.pk)
        extraer_datos_juridicos(primero.pk)
        evaluar_calidad_documento(primero.pk)
        segundo, _ = self.cargar(crear_pdf_juridico('version-dos.pdf', efecto='Nota editorial adicional.'))
        procesar_documento(segundo.pk)
        extraer_datos_juridicos(segundo.pk)
        evaluacion = evaluar_calidad_documento(segundo.pk)
        segundo.refresh_from_db()
        self.assertEqual(evaluacion.resultado, EvaluacionCalidad.Resultado.DUPLICADO_CONFIRMADO)
        self.assertEqual(segundo.documento_canonico, primero)
        self.assertTrue(evaluacion.alertas.filter(codigo='MISMA_NORMA_OTRO_PDF').exists())

    def test_ocr_muy_bajo_genera_alerta_grave(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        resultado = procesar_documento(documento.pk)
        resultado.ocr_aplicado = True
        resultado.requirio_ocr = True
        resultado.confianza_ocr = 40
        resultado.save()
        extraer_datos_juridicos(documento.pk)
        evaluacion = evaluar_calidad_documento(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, Documento.Estado.OBSERVADO)
        self.assertTrue(evaluacion.alertas.filter(codigo='OCR_BAJA_CALIDAD', severidad=AlertaCalidad.Severidad.GRAVE).exists())

    def test_objeto_faltante_envia_a_revision_rapida(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        propuesta.objeto_propuesto = ''
        propuesta.save(update_fields=('objeto_propuesto', 'updated_at'))
        propuesta.evidencias.filter(campo=EvidenciaExtraccion.Campo.OBJETO).delete()
        evaluacion = evaluar_calidad_documento(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, Documento.Estado.PENDIENTE_REVISION_RAPIDA)
        self.assertTrue(evaluacion.alertas.filter(codigo='OBJETO_FALTANTE').exists())

    @patch('apps.normativa.tasks.evaluar_calidad_documento_task.delay')
    def test_endpoint_control_calidad_encola_celery(self, delay):
        delay.return_value = Mock(id='quality-123')
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        extraer_datos_juridicos(documento.pk)
        response = self.client.post(reverse('documento-control-calidad', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['estado'], EvaluacionCalidad.Estado.EN_COLA)
        self.assertEqual(response.data['tarea_id'], 'quality-123')

    def test_api_resultado_calidad_incluye_alertas_y_coincidencias(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        propuesta.titulo_propuesto = ''
        propuesta.save(update_fields=('titulo_propuesto', 'updated_at'))
        evaluar_calidad_documento(documento.pk)
        response = self.client.get(reverse('documento-resultado-calidad', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['alertas']), 1)
        self.assertIn('coincidencias', response.data)

    def test_bandeja_revision_muestra_documento_y_confianza(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        evaluar_calidad_documento(documento.pk)
        response = self.client.get(reverse('documento-bandeja-revision'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        item = response.data['results'][0]
        self.assertEqual(item['uuid'], str(documento.uuid))
        self.assertEqual(item['titulo_propuesto'], propuesta.titulo_propuesto)
        self.assertIsNotNone(item['confianza_global'])

    @patch('apps.normativa.tasks.convertir_documento_final_task.delay')
    def test_aprobar_revision_copia_ficha_y_encola_conversion(self, delay):
        delay.return_value = Mock(id='conversion-automatica-123')
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        evaluar_calidad_documento(documento.pk)
        payload = {
            'tipo_norma': propuesta.tipo_norma_propuesto_id,
            'efecto_normativo': propuesta.efecto_normativo_propuesto_id,
            'materia': propuesta.materia_propuesta_id,
            'entidad_emisora': propuesta.entidad_emisora_propuesta_id,
            'numero': propuesta.numero_propuesto,
            'fecha_emision': propuesta.fecha_emision_propuesta.isoformat(),
            'titulo': propuesta.titulo_propuesto,
            'objeto': propuesta.objeto_propuesto,
            'titulo_archivo': 'Código Tributario',
            'objeto_resumido': 'Sistema Tributario Boliviano',
            'observaciones': '',
            'observaciones_revision': 'Ficha verificada con el PDF original.',
            'decisiones_alertas': [],
        }
        ResultadoConversion.objects.create(
            documento=documento,
            estado=ResultadoConversion.Estado.ERROR,
            error_codigo='FICHA_INCOMPLETA',
            error_mensaje='Error anterior.',
        )
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                reverse('documento-aprobar-revision-juridica', kwargs={'uuid': documento.uuid}),
                payload,
                format='json',
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        documento.refresh_from_db()
        revision = documento.revisiones_juridicas.get()
        self.assertEqual(documento.estado, Documento.Estado.LISTO_PARA_CONVERSION)
        self.assertEqual(documento.numero, propuesta.numero_propuesto)
        self.assertEqual(revision.estado, RevisionJuridica.Estado.APROBADA)
        self.assertEqual(revision.cambios.count(), 11)
        self.assertTrue(revision.cambios.filter(
            campo='titulo',
            origen_valor=CambioRevisionJuridica.OrigenValor.PROPUESTA,
        ).exists())
        self.assertTrue(documento.historial.filter(
            accion=HistorialDocumento.Accion.REVISION_APROBADA,
        ).exists())
        evaluacion = documento.evaluacion_calidad
        resultado = documento.resultado_conversion
        self.assertEqual(
            evaluacion.resultado,
            EvaluacionCalidad.Resultado.SIN_ALERTAS_GRAVES,
        )
        self.assertEqual(resultado.estado, ResultadoConversion.Estado.EN_COLA)
        self.assertEqual(resultado.error_codigo, '')
        self.assertEqual(resultado.tarea_id, 'conversion-automatica-123')
        delay.assert_called_once_with(documento.pk)

    def test_alerta_activa_debe_resolverse_antes_de_aprobar(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        propuesta = extraer_datos_juridicos(documento.pk)
        propuesta.objeto_propuesto = ''
        propuesta.save(update_fields=('objeto_propuesto', 'updated_at'))
        propuesta.evidencias.filter(campo=EvidenciaExtraccion.Campo.OBJETO).delete()
        evaluacion = evaluar_calidad_documento(documento.pk)
        alerta = evaluacion.alertas.get(codigo='OBJETO_FALTANTE')
        payload = {
            'tipo_norma': propuesta.tipo_norma_propuesto_id,
            'efecto_normativo': propuesta.efecto_normativo_propuesto_id,
            'materia': propuesta.materia_propuesta_id,
            'entidad_emisora': propuesta.entidad_emisora_propuesta_id,
            'numero': propuesta.numero_propuesto,
            'fecha_emision': propuesta.fecha_emision_propuesta.isoformat(),
            'titulo': propuesta.titulo_propuesto,
            'objeto': 'La presente Ley regula las obligaciones tributarias.',
            'titulo_archivo': 'Código Tributario',
            'objeto_resumido': 'Obligaciones tributarias en Bolivia',
            'decisiones_alertas': [],
        }
        url = reverse('documento-aprobar-revision-juridica', kwargs={'uuid': documento.uuid})
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        payload['decisiones_alertas'] = [{
            'alerta_id': alerta.pk,
            'decision': 'RESUELTA',
            'justificacion': 'Objeto confirmado directamente en el artículo 1.',
        }]
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        alerta.refresh_from_db()
        self.assertEqual(alerta.estado, AlertaCalidad.Estado.RESUELTA)

    def test_devolver_revision_conserva_motivo_y_observa_documento(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        extraer_datos_juridicos(documento.pk)
        evaluar_calidad_documento(documento.pk)
        response = self.client.post(
            reverse('documento-devolver-revision-juridica', kwargs={'uuid': documento.uuid}),
            {'motivo': 'La fecha debe verificarse con otra publicación oficial.'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documento.refresh_from_db()
        revision = documento.revisiones_juridicas.get()
        self.assertEqual(documento.estado, Documento.Estado.OBSERVADO)
        self.assertEqual(revision.estado, RevisionJuridica.Estado.DEVUELTA)

    def test_detalle_revision_incluye_evidencia_historial_y_origen(self):
        documento, _ = self.cargar(crear_pdf_juridico())
        procesar_documento(documento.pk)
        extraer_datos_juridicos(documento.pk)
        evaluar_calidad_documento(documento.pk)
        response = self.client.get(
            reverse('documento-revision-juridica', kwargs={'uuid': documento.uuid})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data['propuesta']['evidencias']), 0)
        self.assertIn('alertas', response.data['calidad'])
        self.assertGreater(len(response.data['historial']), 0)

    def test_conversion_real_genera_word_final_por_materia(self):
        documento = self.preparar_para_conversion()
        resultado = convertir_documento_final(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(documento.estado, Documento.Estado.FINALIZADO)
        self.assertEqual(resultado.estado, ResultadoConversion.Estado.COMPLETADA)
        self.assertEqual(resultado.carpeta_materia, 'Derecho Tributario')
        self.assertTrue(resultado.nombre_archivo.startswith('O; L; 2492; 02-08-2003;'))
        self.assertTrue(resultado.nombre_archivo.endswith('.docx'))
        self.assertLessEqual(
            len(resultado.nombre_archivo),
            240 - 100 - len(resultado.carpeta_materia) - 2,
        )
        self.assertIn('; ', resultado.ruta_relativa)
        self.assertIn('Derecho Tributario/', resultado.ruta_relativa)
        self.assertTrue(resultado.archivo.storage.exists(resultado.archivo.name))
        self.assertEqual(len(resultado.hash_sha256), 64)
        self.assertGreater(resultado.tamano_bytes, 0)
        self.assertTrue(resultado.archivo_pdf.storage.exists(resultado.archivo_pdf.name))
        self.assertEqual(Path(resultado.nombre_archivo).stem, Path(resultado.nombre_archivo_pdf).stem)
        self.assertTrue(resultado.nombre_archivo_pdf.endswith('.pdf'))
        self.assertIn('Derecho Tributario/', resultado.ruta_pdf_relativa)
        self.assertEqual(len(resultado.hash_pdf_sha256), 64)
        self.assertGreater(resultado.tamano_pdf_bytes, 0)
        self.assertTrue(resultado.pdf_texto_buscable)
        self.assertEqual(resultado.detalles_tecnicos['conversor'], 'pdf2docx')
        self.assertTrue(resultado.detalles_tecnicos['texto_editable'])

    def test_conversion_ocr_genera_word_visual_de_alta_calidad(self):
        from docx import Document

        documento = self.preparar_para_conversion()
        procesamiento = documento.resultado_procesamiento
        procesamiento.requirio_ocr = True
        procesamiento.ocr_aplicado = True
        procesamiento.save(update_fields=('requirio_ocr', 'ocr_aplicado', 'updated_at'))
        pagina = procesamiento.paginas.get(numero_pagina=1)
        pagina.texto = (
            'REGLAMENTO ADUANERO DEL ÁREA DE CONTROL INTEGRADO\n\n'
            'Artículo 1. El presente texto debe permanecer editable.'
        )
        pagina.caracteres = len(pagina.texto)
        pagina.save(update_fields=('texto', 'caracteres'))

        resultado = convertir_documento_final(documento.pk)

        with resultado.archivo.open('rb') as archivo:
            documento_word = Document(archivo)
        self.assertEqual(len(documento_word.inline_shapes), 1)
        self.assertEqual(
            resultado.detalles_tecnicos['conversor'],
            'pdf-imagen-alta-calidad',
        )
        self.assertFalse(resultado.detalles_tecnicos['texto_editable'])
        self.assertEqual(resultado.detalles_tecnicos['calidad_dpi'], 300)

    @patch('apps.normativa.conversion.pdf_tiene_paginas_dominadas_por_imagen', return_value=True)
    def test_conversion_visual_para_pdf_ocr_clasificado_como_texto(self, _detectar):
        from docx import Document

        documento = self.preparar_para_conversion()
        procesamiento = documento.resultado_procesamiento
        self.assertFalse(procesamiento.requirio_ocr)

        resultado = convertir_documento_final(documento.pk)

        with resultado.archivo.open('rb') as archivo:
            documento_word = Document(archivo)
        self.assertEqual(len(documento_word.inline_shapes), 1)
        self.assertEqual(resultado.detalles_tecnicos['conversor'], 'pdf-imagen-alta-calidad')
        self.assertFalse(resultado.detalles_tecnicos['texto_editable'])
        self.assertTrue(resultado.detalles_tecnicos['pdf_respaldado_por_imagen'])

    def test_conversion_acepta_alertas_historicas_ya_revisadas(self):
        documento = self.preparar_para_conversion()
        documento.numero = '2492-HISTORICO'
        documento.save(update_fields=('numero', 'updated_at'))
        evaluacion = documento.evaluacion_calidad
        evaluacion.resultado = EvaluacionCalidad.Resultado.ALERTA_LEVE
        evaluacion.save(update_fields=('resultado', 'updated_at'))
        AlertaCalidad.objects.create(
            evaluacion=evaluacion,
            codigo='ALERTA_REVISADA',
            titulo='Alerta revisada',
            descripcion='La observación ya fue atendida por el abogado.',
            severidad=AlertaCalidad.Severidad.LEVE,
            estado=AlertaCalidad.Estado.RESUELTA,
        )

        resultado = convertir_documento_final(documento.pk)

        self.assertEqual(resultado.estado, ResultadoConversion.Estado.COMPLETADA)

    def test_conversion_rechaza_alertas_que_siguen_activas(self):
        documento = self.preparar_para_conversion()
        evaluacion = documento.evaluacion_calidad
        evaluacion.resultado = EvaluacionCalidad.Resultado.ALERTA_LEVE
        evaluacion.save(update_fields=('resultado', 'updated_at'))
        AlertaCalidad.objects.create(
            evaluacion=evaluacion,
            codigo='ALERTA_PENDIENTE',
            titulo='Alerta pendiente',
            descripcion='Todavía necesita una decisión jurídica.',
            severidad=AlertaCalidad.Severidad.LEVE,
        )

        with self.assertRaises(ErrorConversion) as contexto:
            convertir_documento_final(documento.pk)

        self.assertEqual(contexto.exception.codigo, 'CALIDAD_NO_APROBADA')

    def test_conversion_no_sobrescribe_nombre_existente(self):
        documento = self.preparar_para_conversion()
        from apps.normativa.conversion import generar_nomenclatura_final

        _, nombre, _ = generar_nomenclatura_final(documento)
        storage = ResultadoConversion._meta.get_field('archivo').storage
        ruta = f'{documento.materia.carpeta_destino}/{nombre}'
        storage.save(ruta, SimpleUploadedFile(nombre, b'archivo-existente'))
        resultado = convertir_documento_final(documento.pk)
        self.assertEqual(resultado.version, 2)
        self.assertIn('; v2.docx', resultado.nombre_archivo)
        self.assertIn('; v2.pdf', resultado.nombre_archivo_pdf)
        self.assertEqual(Path(resultado.nombre_archivo).stem, Path(resultado.nombre_archivo_pdf).stem)

    def test_nomenclatura_larga_no_agrega_hash_ni_puntos_suspensivos(self):
        from apps.normativa.conversion import generar_nomenclatura_final

        documento = self.preparar_para_conversion()
        documento.titulo_archivo = (
            'Regulación integral de la administración tributaria nacional '
            'y sus procedimientos institucionales'
        )
        documento.objeto_resumido = (
            'Establece las obligaciones tributarias y los procedimientos '
            'aplicables a todas las instituciones públicas del país'
        )
        documento.save(update_fields=(
            'titulo_archivo',
            'objeto_resumido',
            'updated_at',
        ))

        nomenclatura, nombre, truncado = generar_nomenclatura_final(documento)

        self.assertTrue(truncado)
        self.assertNotIn('...', nombre)
        self.assertNotRegex(nombre, r'; [0-9a-f]{8}\.docx$')
        self.assertEqual(nomenclatura, nombre.removesuffix('.docx'))
        self.assertTrue(nombre.endswith('; Derecho Tributario.docx'))

    def test_conversion_rechaza_ficha_definitiva_incompleta(self):
        documento = self.preparar_para_conversion()
        documento.objeto = ''
        documento.save(update_fields=('objeto', 'updated_at'))
        with self.assertRaises(ErrorConversion) as contexto:
            convertir_documento_final(documento.pk)
        documento.refresh_from_db()
        self.assertEqual(contexto.exception.codigo, 'FICHA_INCOMPLETA')
        self.assertEqual(documento.estado, Documento.Estado.LISTO_PARA_CONVERSION)

    def test_tarea_conversion_persiste_error_de_ficha_incompleta(self):
        documento = self.preparar_para_conversion()
        documento.objeto = ''
        documento.save(update_fields=('objeto', 'updated_at'))
        ResultadoConversion.objects.create(
            documento=documento,
            estado=ResultadoConversion.Estado.EN_COLA,
            tarea_id='task-incompleta',
        )
        with self.assertRaises(RuntimeError):
            convertir_documento_final_task.run(documento.pk)
        documento.refresh_from_db()
        resultado = documento.resultado_conversion
        self.assertEqual(resultado.estado, ResultadoConversion.Estado.ERROR)
        self.assertEqual(resultado.error_codigo, 'FICHA_INCOMPLETA')
        self.assertEqual(documento.estado, Documento.Estado.PENDIENTE_APROBACION)

    @patch('apps.normativa.tasks.convertir_documento_final_task.delay')
    def test_endpoint_conversion_encola_celery(self, delay):
        delay.return_value = Mock(id='conversion-123')
        documento = self.preparar_para_conversion()
        response = self.client.post(reverse('documento-convertir-word', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data['estado'], ResultadoConversion.Estado.EN_COLA)
        self.assertEqual(response.data['tarea_id'], 'conversion-123')

    def test_api_resultado_y_descarga_word(self):
        documento = self.preparar_para_conversion()
        convertir_documento_final(documento.pk)
        response = self.client.get(reverse('documento-resultado-conversion', kwargs={'uuid': documento.uuid}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['archivo_url'].endswith('/archivo-word/'))
        self.assertTrue(response.data['archivo_pdf_url'].endswith('/archivo-pdf-consulta/'))
        self.assertTrue(response.data['pdf_texto_buscable'])
        descarga = self.client.get(reverse('documento-archivo-word', kwargs={'uuid': documento.uuid}))
        self.assertEqual(descarga.status_code, status.HTTP_200_OK)
        self.assertIn('wordprocessingml.document', descarga['Content-Type'])
        descarga_pdf = self.client.get(
            reverse('documento-archivo-pdf-consulta', kwargs={'uuid': documento.uuid})
        )
        self.assertEqual(descarga_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(descarga_pdf['Content-Type'], 'application/pdf')

    def test_descarga_word_faltante_responde_404_sin_exponer_error(self):
        documento = self.preparar_para_conversion()
        ResultadoConversion.objects.create(
            documento=documento,
            estado=ResultadoConversion.Estado.COMPLETADA,
            archivo='Derecho Tributario/archivo-inexistente.docx',
            nombre_archivo='archivo-inexistente.docx',
        )

        response = self.client.get(
            reverse('documento-archivo-word', kwargs={'uuid': documento.uuid})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('no está disponible', response.data['detail'])
