/**
 * Catálogo del módulo de Libros: extensiones admitidas, materias sugeridas y
 * utilidades de formato compartidas entre el cargador y el catálogo.
 */

export const EXTENSIONES_LIBRO = ["pdf", "docx", "txt"] as const;

export type ExtensionLibro = (typeof EXTENSIONES_LIBRO)[number];

export const MIME_POR_EXTENSION_LIBRO: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

/** Tamaño máximo aceptado por el cargador (los libros pesan más que una norma). */
export const TAMANO_MAXIMO_LIBRO = 80 * 1024 * 1024;

/**
 * Materias sugeridas en el formulario. No es una lista cerrada: el campo
 * admite escribir cualquier otra materia.
 */
export const MATERIAS_LIBRO = [
  "Derecho Constitucional",
  "Derecho Administrativo",
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Procesal",
  "Derecho Laboral",
  "Derecho Tributario",
  "Derecho Comercial",
  "Derecho de Familia",
  "Derecho Internacional",
  "Derechos Humanos",
  "Doctrina y Teoría del Derecho",
] as const;

/** Criterios de ordenamiento del catálogo (los comparten el cliente y el servidor). */
export const ORDENES_LIBROS = ["recientes", "titulo", "autor", "anio"] as const;

export type OrdenLibros = (typeof ORDENES_LIBROS)[number];

export function esOrdenLibros(valor: string): valor is OrdenLibros {
  return (ORDENES_LIBROS as readonly string[]).includes(valor);
}

export const OPCIONES_ORDEN_LIBROS: { valor: OrdenLibros; etiqueta: string }[] = [
  { valor: "recientes", etiqueta: "Agregados recientemente" },
  { valor: "titulo", etiqueta: "Título (A–Z)" },
  { valor: "autor", etiqueta: "Autor (A–Z)" },
  { valor: "anio", etiqueta: "Año de publicación" },
];

export function extensionDeArchivo(nombre: string): string {
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? "" : nombre.slice(punto + 1).toLowerCase();
}

export function esExtensionPermitida(extension: string): extension is ExtensionLibro {
  return (EXTENSIONES_LIBRO as readonly string[]).includes(extension);
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Año mínimo admitido en el formulario; evita erratas del tipo "19" o "202". */
export const ANIO_MINIMO_LIBRO = 1500;

export function anioMaximoLibro(): number {
  return new Date().getFullYear() + 1;
}
