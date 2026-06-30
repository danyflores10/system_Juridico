# Frontend - Consultor Jurídico

Aplicación web de Consultor Jurídico construida con Next.js, React, TypeScript y Tailwind CSS. Esta etapa utiliza datos locales y no requiere base de datos.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación

Desde la raiz del repositorio:

```bash
cd Frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre la aplicación en:

```text
http://localhost:3000
```

## Producción

```bash
npm run build
npm run start
```

## Calidad de código

```bash
npm run lint
npm run check
npm run format
```

## Estructura principal

```text
Frontend/
+-- src/app/          # Rutas y pantallas de Next.js
+-- src/components/   # Componentes reutilizables
+-- src/lib/          # Utilidades y configuracion compartida
+-- src/navigation/   # Configuración de navegación
+-- media/            # Recursos visuales del proyecto
```

## Variables de entorno

Actualmente no hay variables obligatorias para ejecutar el frontend. Si agregas configuraciones locales, usa un archivo `.env.local` dentro de `Frontend` y no lo subas al repositorio.
