# Backend del Sistema Consultor Jurídico

## Ejecución de Django

```powershell
.\venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver
```

## Procesamiento PDF y OCR

El procesamiento pesado se ejecuta fuera de Django mediante Celery. Redis,
OCRmyPDF, Tesseract y el idioma español están encapsulados en Docker.

```powershell
docker compose -f docker-compose.ocr.yml up -d --build
docker compose -f docker-compose.ocr.yml logs -f ocr_worker
```

Para detener la infraestructura sin borrar sus datos:

```powershell
docker compose -f docker-compose.ocr.yml stop
```

Endpoints principales:

- `POST /api/v1/documentos/{uuid}/procesar/`
- `POST /api/v1/documentos/{uuid}/reintentar-procesamiento/`
- `GET /api/v1/documentos/{uuid}/resultado-procesamiento/`
- `GET /api/v1/documentos/{uuid}/archivo-procesado/`
- `POST /api/v1/documentos/{uuid}/extraer-datos/`
- `POST /api/v1/documentos/{uuid}/reintentar-extraccion/`
- `GET /api/v1/documentos/{uuid}/propuesta-extraccion/`
- `POST /api/v1/documentos/{uuid}/control-calidad/`
- `POST /api/v1/documentos/{uuid}/reintentar-calidad/`
- `GET /api/v1/documentos/{uuid}/resultado-calidad/`
- `POST /api/v1/documentos/{uuid}/convertir-word/`
- `POST /api/v1/documentos/{uuid}/reintentar-conversion/`
- `GET /api/v1/documentos/{uuid}/resultado-conversion/`
- `GET /api/v1/documentos/{uuid}/archivo-word/`

El PDF original nunca se reemplaza. El resultado se guarda como
`PDF_PROCESADO`, el texto se almacena por página y el documento termina en
`PENDIENTE_EXTRACCION` o `ERROR`.

Cuando termina el procesamiento, Celery encadena la extracción jurídica.
Las sugerencias se guardan en una propuesta independiente con confianza,
página, fragmento y regla aplicada para cada campo. Nunca se sobrescribe la
ficha jurídica definitiva; el documento queda en `PENDIENTE_REVISION`.

El control de calidad se encadena después de la extracción. Compara hashes,
identificadores, fechas, títulos y contenido; revisa OCR, texto y confianza de
campos. Los duplicados se vinculan mediante `documento_canonico`, pero nunca se
eliminan ni fusionan automáticamente.

La conversión final solo acepta documentos en `LISTO_PARA_CONVERSION` con
ficha jurídica definitiva completa. Genera un DOCX mediante `pdf2docx`, crea
la carpeta configurada por materia dentro de `NORMATIVA EMITIDA`, evita
sobrescrituras y registra nombre, ruta, hash, tamaño y versión.

## Descarga automática desde fuentes

Celery Beat revisa cada 30 minutos qué fuentes `DIARIA` o `SEMANAL` están
vencidas. Cada ejecución descubre enlaces PDF en HTML, RSS o JSON, valida
redirecciones y direcciones públicas, limita tamaños, evita repetir URLs y
hashes, y registra cada resultado en `HallazgoFuente`. Los PDF nuevos se
envían automáticamente al procesamiento técnico.

Endpoints:

- `POST /api/v1/fuentes/{id}/ejecutar-descarga/`
- `GET /api/v1/fuentes-ejecuciones/?fuente={id}`
- `GET /api/v1/fuentes-hallazgos/?ejecucion={id}`

Configuración opcional en `configuracion`, tanto de fuente como de sección:

```json
{
  "max_documentos_por_ejecucion": 50,
  "patron_incluir": "\\.pdf($|\\?)",
  "patron_excluir": "boletin|formulario"
}
```

El motor genérico soporta HTTP, HTML, RSS, JSON y páginas JavaScript mediante
Playwright/Chromium. Las fuentes con autenticación requieren un adaptador
específico para su portal; no se intenta eludir CAPTCHA ni controles de acceso.

## Revisión jurídica y auditoría

Después del control de calidad, todo documento queda en la bandeja jurídica.
Aunque no tenga alertas, solo una aprobación explícita puede cambiarlo a
`LISTO_PARA_CONVERSION`. La revisión conserva la ficha anterior y aprobada,
cada cambio de campo, confianza, evidencia, decisiones sobre alertas, usuario y
fechas.

Endpoints:

- `GET /api/v1/documentos/bandeja-revision/`
- `GET /api/v1/documentos/{uuid}/revision-juridica/`
- `POST /api/v1/documentos/{uuid}/iniciar-revision/`
- `POST /api/v1/documentos/{uuid}/aprobar-revision/`
- `POST /api/v1/documentos/{uuid}/devolver-revision/`
