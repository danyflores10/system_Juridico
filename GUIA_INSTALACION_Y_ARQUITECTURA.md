# Guía de instalación y arquitectura del Sistema Jurídico

Esta guía explica cómo levantar el proyecto completo desde una computadora nueva, cómo está organizada la API, cómo el frontend consume esa API y cuáles fueron los módulos incorporados para el cargador jurídico.

Los comandos principales están escritos para **Windows PowerShell**, que es el entorno usado actualmente por el equipo.

## 1. Qué incluye el sistema

El repositorio tiene dos aplicaciones principales:

- `Backend/`: API REST construida con Django y Django REST Framework.
- `Frontend/`: interfaz web construida con Next.js, React y TypeScript.

El flujo jurídico incorporado permite:

1. Administrar catálogos jurídicos.
2. Registrar fuentes web y sus secciones.
3. Descargar documentos PDF de forma manual o programada.
4. Cargar PDF manualmente.
5. Analizar el PDF y aplicar OCR cuando sea necesario.
6. Extraer datos jurídicos sugeridos.
7. Ejecutar controles de calidad y detectar posibles duplicados.
8. Revisar y aprobar la información jurídicamente.
9. Convertir el documento aprobado a Word.
10. Guardar el resultado final organizado por materia.

## 2. Herramientas necesarias

Antes de clonar el proyecto deben instalarse las siguientes herramientas:

| Herramienta | Uso | Versión recomendada |
|---|---|---|
| Git | Clonar y actualizar el repositorio | Versión estable actual |
| Python | Ejecutar Django | Python 3.12 |
| PostgreSQL | Base de datos principal | PostgreSQL 15 o superior |
| Node.js | Ejecutar Next.js | Node.js 20 LTS o superior |
| npm | Instalar dependencias del frontend | Incluido con Node.js |
| Docker Desktop | Ejecutar Redis, Celery, OCR y Chromium | Versión estable actual |
| Visual Studio Code | Editor recomendado | Opcional |

Docker Desktop debe estar abierto y funcionando antes de iniciar los servicios de OCR.

Para comprobar las instalaciones:

```powershell
git --version
py --version
node --version
npm --version
docker --version
docker compose version
psql --version
```

Si `psql` no aparece, PostgreSQL puede estar instalado pero su carpeta `bin` no está agregada al `PATH`. También puede administrarse la base de datos mediante pgAdmin.

## 3. Puertos utilizados

| Servicio | Puerto |
|---|---:|
| Frontend Next.js | 3000 |
| Backend Django | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |

Estos puertos deben estar disponibles.

## 4. Clonar el repositorio

### Opción A: clonar la rama principal después de integrar el módulo

```powershell
git clone https://github.com/danyflores10/system_Juridico.git
cd system_Juridico
```

### Opción B: probar directamente la rama actual del cargador jurídico

Mientras el módulo todavía no esté integrado a la rama principal:

```powershell
git clone --branch modulo/cargador-juridico-V1 https://github.com/danyflores10/system_Juridico.git
cd system_Juridico
```

Para confirmar la rama actual:

```powershell
git branch --show-current
```

## 5. Preparar PostgreSQL

La aplicación usa PostgreSQL; no utiliza SQLite.

### Opción con `psql`

Abrir una terminal y conectarse con el usuario administrador de PostgreSQL:

```powershell
psql -U postgres
```

Dentro de `psql`, crear un usuario y una base de datos para el proyecto:

```sql
CREATE USER juridico_user WITH PASSWORD 'colocar_una_contrasena_segura';
CREATE DATABASE juridico_db OWNER juridico_user;
\q
```

No se debe reutilizar literalmente la contraseña del ejemplo. Cada integrante debe definir su propia contraseña local.

### Opción con pgAdmin

1. Abrir pgAdmin.
2. Conectarse al servidor PostgreSQL local.
3. Crear un usuario llamado `juridico_user` desde `Login/Group Roles`.
4. Asignarle una contraseña.
5. Crear una base de datos llamada `juridico_db`.
6. Seleccionar `juridico_user` como propietario de la base.

## 6. Instalar y configurar el backend

Desde la raíz del repositorio:

```powershell
cd Backend
py -3.12 -m venv venv
```

Activar el entorno virtual:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

Actualizar `pip` e instalar dependencias:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Cuando el entorno esté activo, PowerShell mostrará normalmente `(venv)` al inicio de la línea.

### 6.1 Crear el archivo de variables locales

Copiar el archivo de ejemplo:

```powershell
Copy-Item .env.example .env
```

Abrir `Backend/.env` y ajustar, como mínimo:

```dotenv
DB_NAME=juridico_db
DB_USER=juridico_user
DB_PASSWORD=la_contrasena_creada_en_postgresql
DB_HOST=127.0.0.1
DB_PORT=5432

DJANGO_SECRET_KEY=una_clave_larga_y_unica
DJANGO_DEBUG=True
```

Se puede generar una clave para Django con:

```powershell
python -c "from secrets import token_urlsafe; print(token_urlsafe(50))"
```

Copiar el resultado en `DJANGO_SECRET_KEY`.

Reglas importantes:

- `Backend/.env` es local y **nunca debe subirse a Git**.
- `Backend/.env.example` sí se versiona, pero solo debe contener valores ficticios.
- `DJANGO_DEBUG=True` es únicamente para desarrollo local.
- `FINAL_NORMATIVA_ROOT` vacío usa automáticamente `Backend/NORMATIVA EMITIDA/`.

### 6.2 Crear las tablas y catálogos iniciales

Con el entorno virtual activo y dentro de `Backend/`:

```powershell
python manage.py migrate
python manage.py seed_catalogos
python manage.py check
```

Qué hace cada comando:

- `migrate`: crea o actualiza las tablas de PostgreSQL usando las migraciones.
- `seed_catalogos`: crea o actualiza los catálogos jurídicos iniciales sin duplicarlos.
- `check`: valida la configuración de Django.

Opcionalmente puede crearse un administrador:

```powershell
python manage.py createsuperuser
```

### 6.3 Ejecutar la API

```powershell
python manage.py runserver
```

La API queda disponible en:

- API base: `http://localhost:8000/api/v1/`
- Swagger: `http://localhost:8000/api/docs/`
- Esquema OpenAPI: `http://localhost:8000/api/schema/`
- Administración Django: `http://localhost:8000/admin/`

No cerrar esta terminal mientras se usa el backend.

## 7. Iniciar Redis, Celery, OCR y el programador

El procesamiento pesado no se ejecuta dentro del proceso web de Django. Se envía a Celery mediante Redis.

Los contenedores definidos en `Backend/docker-compose.ocr.yml` son:

- `redis`: cola y almacenamiento de resultados de Celery.
- `ocr_worker`: trabajador que procesa PDF, OCR, extracción, calidad y conversión.
- `scheduler`: Celery Beat, que revisa periódicamente las fuentes programadas.

Con Docker Desktop abierto, desde `Backend/` ejecutar:

```powershell
docker compose -f docker-compose.ocr.yml up -d --build
```

Comprobar el estado:

```powershell
docker compose -f docker-compose.ocr.yml ps
```

Ver los registros del trabajador:

```powershell
docker compose -f docker-compose.ocr.yml logs -f ocr_worker
```

Ver los registros del programador:

```powershell
docker compose -f docker-compose.ocr.yml logs -f scheduler
```

Salir de la vista de registros con `Ctrl+C`; los contenedores seguirán ejecutándose.

Para detenerlos sin borrar el volumen de Redis:

```powershell
docker compose -f docker-compose.ocr.yml stop
```

Para iniciarlos nuevamente:

```powershell
docker compose -f docker-compose.ocr.yml start
```

Si se cambió código Python, dependencias o el Dockerfile, reconstruir:

```powershell
docker compose -f docker-compose.ocr.yml up -d --build
```

El contenedor incluye:

- OCRmyPDF.
- Tesseract OCR.
- Idioma español para Tesseract.
- Ghostscript.
- qpdf, pngquant y unpaper.
- Chromium y Playwright para fuentes que necesitan renderizar JavaScript.

## 8. Instalar y configurar el frontend

Abrir una segunda terminal en la raíz del repositorio:

```powershell
cd Frontend
Copy-Item .env.example .env.local
npm ci
```

`npm ci` instala exactamente las versiones registradas en `package-lock.json`. Para una clonación nueva es preferible a `npm install`.

El archivo `Frontend/.env.local` debe contener:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Ejecutar el frontend:

```powershell
npm run dev
```

Abrir:

```text
http://localhost:3000
```

No cerrar esta terminal mientras se usa el frontend.

## 9. Orden diario recomendado para levantar el sistema

### Terminal 1: backend

```powershell
cd system_Juridico\Backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
python manage.py runserver
```

### Terminal 2: servicios Docker

```powershell
cd system_Juridico\Backend
docker compose -f docker-compose.ocr.yml up -d
docker compose -f docker-compose.ocr.yml ps
```

### Terminal 3: frontend

```powershell
cd system_Juridico\Frontend
npm run dev
```

Después abrir `http://localhost:3000`.

## 10. Comprobación rápida después de instalar

1. Abrir `http://localhost:8000/api/docs/` y confirmar que Swagger carga.
2. Abrir `http://localhost:8000/api/v1/catalogos/materias/` y confirmar que devuelve JSON.
3. Abrir `http://localhost:3000` y entrar al panel.
4. Ir a **Configuración > Catálogos jurídicos**.
5. Confirmar que se muestran materias, tipos de norma, efectos y entidades.
6. Ir a **Gestión jurídica > Documentos jurídicos** y cargar un PDF de prueba.
7. Revisar `docker compose ... logs -f ocr_worker` para confirmar que Celery recibe la tarea.

## 11. Arquitectura del backend

La configuración general está en `Backend/config/`:

```text
Backend/config/
├── settings.py       # Django, PostgreSQL, CORS, DRF, archivos y Celery
├── urls.py           # Rutas raíz de API, Swagger y admin
├── celery.py         # Instancia y autodetección de tareas Celery
├── wsgi.py           # Entrada WSGI
└── asgi.py           # Entrada ASGI
```

Las aplicaciones de negocio están agrupadas en `Backend/apps/`:

```text
Backend/apps/
├── catalogos/        # Catálogos y reglas para extracción
├── fuentes/          # Fuentes web, secciones, descarga y programación
└── normativa/        # Documentos, OCR, extracción, calidad, revisión y Word
```

Cada aplicación sigue, en general, estas capas:

```text
urls.py -> views.py -> serializers.py/validators.py -> services.py -> models.py
                                         |
                                         +-> tasks.py -> Celery -> procesamiento pesado
```

### 11.1 Aplicación `catalogos`

Administra:

- Tipos de norma.
- Efectos normativos.
- Materias jurídicas.
- Entidades emisoras.
- Patrones para detectar tipos de norma.
- Palabras clave para detectar materias.
- Reglas para detectar efectos normativos.

Los catálogos no se eliminan físicamente desde la API. Se activan o desactivan para conservar integridad histórica.

El comando `python manage.py seed_catalogos` ejecuta una carga idempotente: puede repetirse sin crear duplicados.

### 11.2 Aplicación `fuentes`

Administra:

- Fuentes web.
- Secciones de una fuente.
- Pruebas de conexión.
- Ejecuciones de descarga.
- Hallazgos encontrados durante cada ejecución.
- Descargas automáticas programadas.

El motor admite listados HTTP, HTML, RSS, JSON y páginas que requieren JavaScript mediante Playwright. También valida redirecciones, tamaño y tipo del documento, y evita repetir URL o contenido.

Celery Beat ejecuta `fuentes.programar_descargas_pendientes` según `SOURCE_SCHEDULER_INTERVAL_SECONDS`, cuyo valor predeterminado es 1800 segundos.

### 11.3 Aplicación `normativa`

Contiene el flujo principal del documento:

```text
PDF recibido
  -> procesamiento técnico y OCR
  -> extracción jurídica sugerida
  -> control de calidad y duplicados
  -> revisión jurídica humana
  -> aprobación
  -> conversión a Word
  -> archivo final organizado por materia
```

Archivos principales:

- `models.py`: documentos, archivos, historial, resultados, evidencias, alertas, revisión y conversión.
- `services.py`: recepción manual/automática y descarte.
- `processing.py`: análisis del PDF, OCR y extracción de texto por página.
- `extraction.py`: detección de tipo, número, fecha, título, objeto, efecto, materia y entidad.
- `quality.py`: controles, alertas y búsqueda de coincidencias o duplicados.
- `review.py`: inicio, aprobación o devolución de una revisión jurídica.
- `conversion.py`: nomenclatura final y conversión del PDF a DOCX.
- `storage.py`: almacenamiento del documento final.
- `tasks.py`: tareas asíncronas y encadenamiento del proceso.
- `views.py`: endpoints REST y acciones del documento.

El PDF original nunca se sobrescribe. Los archivos de entrada y procesados se guardan en `Backend/private_media/`, que está ignorado por Git.

Los DOCX finales se guardan en `Backend/NORMATIVA EMITIDA/` o en la ruta indicada por `FINAL_NORMATIVA_ROOT`. Esa carpeta también está ignorada por Git porque contiene datos generados, no código fuente.

## 12. Cómo está construida la API REST

La API usa:

- Django REST Framework para ViewSets, serializers y routers.
- `django-filter` para filtros.
- `drf-spectacular` para OpenAPI y Swagger.
- Paginación por página, con 20 elementos de forma predeterminada.
- Parámetros `search` y `ordering` en recursos compatibles.
- CORS permitido desde `http://localhost:3000` y `http://127.0.0.1:3000`.

Flujo de una petición:

```text
Navegador
  -> /api/v1/... en config/urls.py
  -> router del módulo en apps/<modulo>/urls.py
  -> ViewSet y acción en views.py
  -> serializer y validadores
  -> servicio de dominio
  -> modelo Django
  -> PostgreSQL
```

Para una operación pesada:

```text
ViewSet -> encola tarea -> Redis -> Celery worker -> OCR/extracción/calidad/conversión
```

El frontend consulta periódicamente el resultado para reflejar los cambios de estado.

### 12.1 Endpoints de catálogos

Base: `/api/v1/catalogos/`

| Recurso | Endpoint |
|---|---|
| Tipos de norma | `tipos-norma/` |
| Efectos normativos | `efectos-normativos/` |
| Materias | `materias/` |
| Entidades emisoras | `entidades-emisoras/` |
| Patrones de tipo | `patrones-tipo-norma/` |
| Palabras clave de materia | `palabras-clave-materia/` |
| Reglas de efectos | `reglas-efecto-normativo/` |

Los recursos principales admiten:

- `GET /`: listar.
- `POST /`: crear.
- `GET /{id}/`: ver detalle.
- `PATCH /{id}/`: actualizar parcialmente.
- `POST /{id}/activar/`: activar.
- `POST /{id}/desactivar/`: desactivar.

### 12.2 Endpoints de fuentes

| Operación | Endpoint |
|---|---|
| CRUD de fuentes | `/api/v1/fuentes/` |
| Probar conexión | `/api/v1/fuentes/{id}/probar-conexion/` |
| Ejecutar descarga | `/api/v1/fuentes/{id}/ejecutar-descarga/` |
| CRUD de secciones | `/api/v1/fuentes-secciones/` |
| Consultar ejecuciones | `/api/v1/fuentes-ejecuciones/` |
| Consultar hallazgos | `/api/v1/fuentes-hallazgos/` |

Ejemplos de filtros:

```text
/api/v1/fuentes/?activa=true
/api/v1/fuentes-secciones/?fuente=1
/api/v1/fuentes-ejecuciones/?fuente=1
/api/v1/fuentes-hallazgos/?ejecucion=10
```

### 12.3 Endpoints de documentos

| Operación | Método y endpoint |
|---|---|
| Listar documentos | `GET /api/v1/documentos/` |
| Ver documento | `GET /api/v1/documentos/{uuid}/` |
| Cargar PDF | `POST /api/v1/documentos/upload/` |
| Descartar | `POST /api/v1/documentos/{uuid}/descartar/` |
| Procesar | `POST /api/v1/documentos/{uuid}/procesar/` |
| Reintentar procesamiento | `POST /api/v1/documentos/{uuid}/reintentar-procesamiento/` |
| Resultado técnico | `GET /api/v1/documentos/{uuid}/resultado-procesamiento/` |
| Descargar PDF procesado | `GET /api/v1/documentos/{uuid}/archivo-procesado/` |
| Extraer datos | `POST /api/v1/documentos/{uuid}/extraer-datos/` |
| Ver propuesta | `GET /api/v1/documentos/{uuid}/propuesta-extraccion/` |
| Ejecutar calidad | `POST /api/v1/documentos/{uuid}/control-calidad/` |
| Ver calidad | `GET /api/v1/documentos/{uuid}/resultado-calidad/` |
| Convertir a Word | `POST /api/v1/documentos/{uuid}/convertir-word/` |
| Ver conversión | `GET /api/v1/documentos/{uuid}/resultado-conversion/` |
| Descargar Word | `GET /api/v1/documentos/{uuid}/archivo-word/` |

La carga usa `multipart/form-data` y el campo del archivo se llama `archivo`.

### 12.4 Endpoints de revisión jurídica

| Operación | Método y endpoint |
|---|---|
| Bandeja | `GET /api/v1/documentos/bandeja-revision/` |
| Detalle | `GET /api/v1/documentos/{uuid}/revision-juridica/` |
| Iniciar revisión | `POST /api/v1/documentos/{uuid}/iniciar-revision/` |
| Aprobar | `POST /api/v1/documentos/{uuid}/aprobar-revision/` |
| Devolver | `POST /api/v1/documentos/{uuid}/devolver-revision/` |

La aprobación conserva la propuesta, evidencias, cambios realizados, decisiones sobre alertas, usuario y fechas. No reemplaza silenciosamente el historial anterior.

## 13. Cómo consume la API el frontend

La integración se divide en capas:

```text
Página Next.js
  -> componente de la funcionalidad
  -> hook de React Query
  -> función de API de la funcionalidad
  -> apiRequest()
  -> Django REST API
```

### 13.1 Cliente HTTP común

`Frontend/src/lib/api/client.ts`:

- Lee `NEXT_PUBLIC_API_URL`.
- Elimina una barra final duplicada.
- Agrega `Accept: application/json`.
- Agrega `Content-Type: application/json` cuando corresponde.
- No fuerza `Content-Type` al enviar `FormData`, para permitir que el navegador genere el boundary.
- Convierte respuestas no exitosas en `ApiError`.
- Extrae mensajes de validación enviados por Django REST Framework.

### 13.2 React Query

`Frontend/src/components/providers/query-provider.tsx` crea un `QueryClient` global. El provider se registra en `Frontend/src/app/layout.tsx`.

React Query se utiliza para:

- Guardar temporalmente respuestas de la API.
- Mostrar estados de carga y error.
- Evitar peticiones duplicadas innecesarias.
- Invalidar datos después de crear o modificar registros.
- Mantener la página anterior durante cambios de filtros.
- Consultar periódicamente procesos asíncronos.

Los documentos en procesamiento se consultan aproximadamente cada 5 segundos. Las ejecuciones activas de fuentes se consultan aproximadamente cada 2 segundos.

### 13.3 Organización por funcionalidad

Cada módulo en `Frontend/src/features/` contiene:

```text
feature/
├── api/          # Funciones HTTP
├── components/   # Tablas, formularios, tarjetas y pantallas cliente
├── hooks/        # useQuery y useMutation
├── schemas/      # Validación de formularios con Zod
└── types/        # Tipos TypeScript de requests y responses
```

Módulos incorporados:

- `features/catalogos/`: tablas, formularios, activación y desactivación.
- `features/fuentes/`: fuentes, secciones, pruebas, ejecuciones y hallazgos.
- `features/documentos/`: carga, detalle, texto, propuesta, calidad y conversión.
- `features/revision/`: bandeja, edición, aprobación y devolución jurídica.

### 13.4 Rutas nuevas del frontend

| Pantalla | Ruta |
|---|---|
| Catálogos | `/dashboard/catalogos` |
| Materias | `/dashboard/catalogos/materias` |
| Tipos de norma | `/dashboard/catalogos/tipos-norma` |
| Efectos | `/dashboard/catalogos/efectos` |
| Entidades | `/dashboard/catalogos/entidades` |
| Documentos | `/dashboard/documentos` |
| Cargar documento | `/dashboard/documentos/cargar` |
| Detalle de documento | `/dashboard/documentos/{uuid}` |
| Texto extraído | `/dashboard/documentos/{uuid}/texto` |
| Propuesta jurídica | `/dashboard/documentos/{uuid}/propuesta` |
| Calidad | `/dashboard/documentos/{uuid}/calidad` |
| Archivo final | `/dashboard/documentos/{uuid}/archivo-final` |
| Fuentes | `/dashboard/fuentes` |
| Detalle de fuente | `/dashboard/fuentes/{id}` |
| Detalle de ejecución | `/dashboard/fuentes/{id}/ejecuciones/{ejecucionId}` |
| Bandeja jurídica | `/dashboard/revision-juridica` |
| Revisión de documento | `/dashboard/revision-juridica/{uuid}` |

El menú lateral fue actualizado para incluir **Documentos jurídicos**, **Revisión jurídica**, **Cargador jurídico** y **Catálogos jurídicos**.

## 14. Cambios principales realizados

### Backend

- El módulo anterior `Backend/catalogos/` se trasladó a `Backend/apps/catalogos/`.
- Se organizaron las aplicaciones bajo el paquete `apps`.
- Se añadieron modelos, serializers, validadores, filtros, permisos, servicios y endpoints de catálogos.
- Se agregó `apps/fuentes` para administrar y descargar desde portales jurídicos.
- Se agregó `apps/normativa` para el flujo completo del documento.
- Se añadió Celery en `config/celery.py` y su carga desde `config/__init__.py`.
- Se registraron las rutas nuevas en `config/urls.py`.
- Se configuraron PostgreSQL, CORS, REST Framework, Swagger, archivos privados, OCR y Celery en `config/settings.py`.
- Se agregaron migraciones de todos los modelos.
- Se añadieron pruebas para fuentes y documentos.
- Se añadieron `Dockerfile.ocr` y `docker-compose.ocr.yml`.
- Se actualizaron las dependencias de `requirements.txt`.

### Frontend

- Se agregó el cliente HTTP común en `src/lib/api/client.ts`.
- Se incorporó TanStack React Query y su provider global.
- Se crearon módulos separados para catálogos, fuentes, documentos y revisión.
- Se añadieron tipos TypeScript y esquemas Zod para evitar payloads inválidos.
- Se agregaron tablas, filtros, formularios, diálogos y estados visuales.
- Se implementó polling para tareas asíncronas.
- Se añadieron páginas del App Router para cada pantalla y detalle.
- Se actualizó el menú lateral.
- Se añadió `Frontend/.env.example` con la URL pública de la API.
- Se actualizaron `package.json` y `package-lock.json`.

## 15. Archivos que no deben subirse a Git

Los siguientes archivos son locales o generados:

```text
Backend/.env
Frontend/.env.local
Backend/venv/
Frontend/node_modules/
Frontend/.next/
Backend/private_media/
Backend/NORMATIVA EMITIDA/
*.log
.vscode/
```

Motivos:

- Los `.env` contienen credenciales locales.
- `venv`, `node_modules` y `.next` se regeneran instalando dependencias.
- `private_media` contiene PDF cargados o procesados.
- `NORMATIVA EMITIDA` contiene DOCX finales.
- Los logs cambian constantemente y pueden contener información local.

Sí deben versionarse `.env.example`, migraciones, `requirements.txt`, `package.json`, `package-lock.json`, Dockerfiles y código fuente.

## 16. Pruebas y verificaciones antes de subir cambios

### Backend

```powershell
cd Backend
.\venv\Scripts\Activate.ps1
python manage.py check
python manage.py test apps.catalogos apps.fuentes apps.normativa
```

### Frontend

```powershell
cd Frontend
npm run check
npm run build
```

### Git

```powershell
git status
git diff --cached
```

Antes de confirmar cambios, revisar que no aparezcan `.env`, PDF, DOCX generados ni logs.

## 17. Problemas frecuentes

### `DJANGO_SECRET_KEY` no existe

Causa: no se creó `Backend/.env` o falta la variable.

Solución:

```powershell
cd Backend
Copy-Item .env.example .env
```

Luego configurar `DJANGO_SECRET_KEY` en `.env`.

### Django no puede conectarse a PostgreSQL

Comprobar:

1. Que el servicio PostgreSQL esté iniciado.
2. Que `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` y `DB_PORT` sean correctos.
3. Que la base de datos exista.
4. Que el usuario sea propietario o tenga permisos.

Probar manualmente:

```powershell
psql -h 127.0.0.1 -p 5432 -U juridico_user -d juridico_db
```

### El contenedor Celery no conecta a PostgreSQL

El compose cambia `DB_HOST` a `host.docker.internal` para acceder al PostgreSQL de Windows.

Si PostgreSQL rechaza la conexión, revisar `postgresql.conf` y `pg_hba.conf`. Debe permitirse la red de Docker con autenticación por contraseña. No usar reglas abiertas con `trust` para todas las direcciones. Reiniciar PostgreSQL después de cambiar su configuración.

### `Connection refused` en Redis

```powershell
cd Backend
docker compose -f docker-compose.ocr.yml up -d redis
docker compose -f docker-compose.ocr.yml ps
```

### El frontend indica que falta `NEXT_PUBLIC_API_URL`

```powershell
cd Frontend
Copy-Item .env.example .env.local
```

Reiniciar `npm run dev` después de crear o cambiar `.env.local`.

### Error de CORS

El frontend debe ejecutarse en `localhost:3000` o `127.0.0.1:3000`. Si se usa otro dominio o puerto, debe agregarse explícitamente a `CORS_ALLOWED_ORIGINS` en `Backend/config/settings.py`.

### Un proceso queda pendiente

Comprobar:

```powershell
docker compose -f Backend/docker-compose.ocr.yml ps
docker compose -f Backend/docker-compose.ocr.yml logs --tail=100 ocr_worker
```

También confirmar que Redis y PostgreSQL estén disponibles.

### El puerto 3000 u 8000 está ocupado

Consultar el proceso en Windows:

```powershell
Get-NetTCPConnection -LocalPort 3000,8000 -ErrorAction SilentlyContinue
```

Debe cerrarse el proceso anterior o utilizarse otro puerto. Si se cambia el puerto del frontend, también debe actualizarse CORS. Si se cambia el puerto del backend, debe actualizarse `NEXT_PUBLIC_API_URL`.

### PowerShell no permite activar el entorno virtual

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

La política se cambia únicamente para la terminal actual.

## 18. Seguridad y estado actual de autenticación

En desarrollo, con `DJANGO_DEBUG=True`, los permisos permiten trabajar localmente sin autenticación para facilitar las pruebas.

Con `DJANGO_DEBUG=False`:

- Las lecturas requieren un usuario autenticado.
- Las modificaciones de catálogos y fuentes requieren un administrador.
- Las revisiones jurídicas pueden ser realizadas por usuarios autenticados.
- Otras modificaciones de documentos requieren administrador.

El cliente HTTP actual no implementa todavía un flujo completo de token o sesión autenticada para esta API. Antes de desplegar en producción deben definirse autenticación, gestión de credenciales, `ALLOWED_HOSTS`, CORS, HTTPS, almacenamiento persistente y variables seguras.

Nunca debe desplegarse con `DJANGO_DEBUG=True`.

## 19. Actualizar una copia ya clonada

Antes de trabajar:

```powershell
git status
git switch modulo/cargador-juridico-V1
git pull --ff-only
```

Si cambiaron dependencias o migraciones:

```powershell
cd Backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_catalogos

cd ..\Frontend
npm ci
```

Si cambió el backend usado por Celery:

```powershell
cd ..\Backend
docker compose -f docker-compose.ocr.yml up -d --build
```

## 20. Resumen mínimo para una instalación nueva

```powershell
git clone --branch modulo/cargador-juridico-V1 https://github.com/danyflores10/system_Juridico.git
cd system_Juridico\Backend
py -3.12 -m venv venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Después de configurar PostgreSQL y editar `Backend/.env`:

```powershell
python manage.py migrate
python manage.py seed_catalogos
python manage.py check
docker compose -f docker-compose.ocr.yml up -d --build
python manage.py runserver
```

En otra terminal:

```powershell
cd system_Juridico\Frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Finalmente abrir:

```text
Frontend: http://localhost:3000
API Swagger: http://localhost:8000/api/docs/
```
