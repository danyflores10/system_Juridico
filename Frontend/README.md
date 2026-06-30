# Frontend - Sistema Juridico

Aplicacion web del Sistema Juridico construida con Next.js, React, TypeScript y Tailwind CSS.

## Requisitos

- Node.js 20 o superior
- npm

## Instalacion

Desde la raiz del repositorio:

```bash
cd Frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre la aplicacion en:

```text
http://localhost:3000
```

## Produccion

```bash
npm run build
npm run start
```

## Calidad de codigo

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
+-- src/navigation/   # Configuracion de navegacion
+-- media/            # Recursos visuales del proyecto
```

## Variables de entorno

Actualmente no hay variables obligatorias para ejecutar el frontend. Si agregas configuraciones locales, usa un archivo `.env.local` dentro de `Frontend` y no lo subas al repositorio.
