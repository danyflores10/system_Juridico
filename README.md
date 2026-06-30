# Sistema Juridico

Sistema web para gestion juridica construido con Next.js, React, TypeScript y Tailwind CSS. El repositorio esta preparado para clonarse, instalar dependencias y ejecutarse localmente desde la carpeta `Frontend`.

## Requisitos

- Git
- Node.js 20 o superior
- npm, incluido con Node.js

## Clonar el proyecto

```bash
git clone https://github.com/danyflores10/system_Juridico.git
cd system_Juridico
```

## Instalar dependencias

```bash
cd Frontend
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

La aplicacion quedara disponible en:

```text
http://localhost:3000
```

## Compilar para produccion

```bash
npm run build
npm run start
```

## Comandos utiles

```bash
npm run lint
npm run check
npm run format
```

## Estructura del proyecto

```text
SYSTEM JURIDICO/
+-- Frontend/   # Aplicacion web Next.js
+-- Backend/    # Espacio reservado para servicios backend
+-- README.md
```

## Variables de entorno

Actualmente el frontend no requiere variables de entorno obligatorias para iniciar. Si se agregan credenciales o configuraciones locales, deben colocarse en `Frontend/.env.local` y no deben subirse al repositorio.

## Notas de instalacion

- No subas `node_modules`, `.next`, entornos virtuales ni archivos `.env`.
- Si el puerto `3000` esta ocupado, Next.js puede solicitar usar otro puerto.
- Para instalar desde cero, ejecuta siempre `npm install` dentro de `Frontend`.
