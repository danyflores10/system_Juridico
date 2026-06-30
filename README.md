# Consultor Jurídico

Plataforma web profesional para gestión jurídica, seguimiento de expedientes, clientes, audiencias, tareas, documentos y honorarios. Está construida con Next.js, React, TypeScript y Tailwind CSS.

La versión actual funciona como una demostración frontend completa y no requiere base de datos. El inicio de sesión y el registro validan los formularios y redirigen al panel principal usando datos locales.

## Requisitos

- Git
- Node.js 20 o superior
- npm, incluido con Node.js

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

## Variables de entorno

Actualmente no se requieren variables de entorno. Cuando se incorpore una API, autenticación real o una base de datos, las credenciales deberán guardarse en `Frontend/.env.local` o en el archivo de entorno correspondiente del backend. Los archivos `.env` nunca deben subirse al repositorio.

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
