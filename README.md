# Consultor Jurídico

Plataforma web profesional para gestión jurídica, seguimiento de expedientes, clientes, audiencias, tareas, documentos y honorarios. Está construida con Next.js, React, TypeScript y Tailwind CSS.

El inicio de sesión y el registro validan los formularios y redirigen al panel principal usando datos locales. El **Módulo 3: Buscador Jurídico** ya está conectado a PostgreSQL (base de datos `systemJuridico`).

## Requisitos

- Git
- Node.js 20 o superior
- npm, incluido con Node.js
- PostgreSQL 18 (para el Buscador Jurídico)

## Clonar el repositorio

```bash
git clone https://github.com/danyflores10/system_Juridico.git
cd system_Juridico
```

## Instalación

```bash
cd Frontend
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación quedará disponible en:

```text
http://localhost:3000
```

## Compilar para producción

```bash
npm run build
npm run start
```

## Comandos útiles

```bash
npm run lint
npm run check
npm run format
```

## Estructura del proyecto

```text
SYSTEM JURIDICO/
+-- Frontend/   # Aplicación web Next.js
+-- Backend/    # Espacio reservado para API, autenticación y persistencia
+-- README.md
```

## Módulo 3: Buscador Jurídico

Buscador sobre la BIBLIOTECA normativa (carpetas **Normativa emitida** y **Normativa actualizada**) con los criterios: tipo de norma, número, rango de fecha de promulgación, título, materia y **objeto o contenido resumido** (búsqueda de texto completo en español, sin distinción de tildes, dentro del contenido de cada archivo).

Los archivos siguen la nomenclatura:

```text
Efecto; TipoNorma; Número; FechaPromulgación; Título; Objeto(Resumido); Materia.pdf
```

Preparación (una sola vez, con PostgreSQL en ejecución):

```bash
cd Frontend
npm install
npm run db:setup   # crea las tablas y la búsqueda de texto completo en systemJuridico
npm run db:seed    # carga normativa boliviana de ejemplo (PDFs generados)
npm run dev
```

Luego abre `http://localhost:3000/dashboard/buscador`.

Características principales:

- Opción **gratuita** (solo abre documentos de Normativa emitida) y **suscripción** (acceso irrestricto; la Normativa actualizada tiene restricción de copia de texto).
- Visor de PDF integrado con zoom, paginación y bloqueo de copia/menú contextual para documentos restringidos.
- Botón **Capturar imagen**: genera un PNG de la página visible con el logo de la empresa como marca de agua para evitar la piratería.
- Carga de nuevos documentos a la biblioteca con validación en vivo de la nomenclatura.

## Variables de entorno

La conexión a la base de datos se define en `Frontend/.env.local` (ver `Frontend/.env.example`):

```text
DATABASE_URL=postgresql://postgres:123456789@localhost:5432/systemJuridico
```

Los archivos `.env` nunca deben subirse al repositorio.

## Flujo de acceso actual

1. Abre `http://localhost:3000`.
2. La aplicación redirige al inicio de sesión.
3. Ingresa un correo válido y una contraseña de al menos 6 caracteres.
4. También puedes registrarte o usar el botón de Google en modo demostración.
5. Después de la validación serás redirigido a `/dashboard/default`.

## Notas de instalación

- No subas `node_modules`, `.next`, entornos virtuales ni archivos `.env`.
- Si el puerto `3000` esta ocupado, Next.js puede solicitar usar otro puerto.
- Para instalar desde cero, ejecuta siempre `npm install` dentro de `Frontend`.
