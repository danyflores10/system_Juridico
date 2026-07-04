/**
 * Catálogo del Módulo 3 — Buscador Jurídico.
 *
 * NOMENCLATURA de todos los archivos de la BIBLIOTECA:
 *   Efecto ; TipoNorma ; Número ; FechaPromulgación/Emisión ; Título ; Objeto(Resumido) ; Materia
 *
 * Ejemplo: DD; L; 2492; 02-08-2003; Código Tributario; Sistema Tributario Boliviano; Derecho Tributario
 */

export const CARPETAS = [
  { valor: "EMITIDA", etiqueta: "Normativa emitida", descripcion: "Acceso libre para todos los usuarios" },
  { valor: "ACTUALIZADA", etiqueta: "Normativa actualizada", descripcion: "Exclusiva para la suscripción" },
] as const;

export type Carpeta = (typeof CARPETAS)[number]["valor"];

export const TIPOS_NORMA = [
  { codigo: "SC", nombre: "Sentencia Constitucional" },
  { codigo: "DC", nombre: "Declaración Constitucional" },
  { codigo: "AC", nombre: "Auto Constitucional" },
  { codigo: "AS", nombre: "Auto Supremo" },
  { codigo: "L", nombre: "Ley" },
  { codigo: "DL", nombre: "Decreto Ley" },
  { codigo: "DS", nombre: "Decreto Supremo" },
  { codigo: "RS", nombre: "Resolución Suprema" },
  { codigo: "RM", nombre: "Resolución Ministerial" },
  { codigo: "RA", nombre: "Resolución Administrativa" },
  { codigo: "RND", nombre: "Resolución Normativa de Directorio" },
  { codigo: "RARA", nombre: "Resolución que Absuelve el Recurso de Alzada" },
  { codigo: "RARR", nombre: "Resolución que Absuelve el Recurso de Revocatoria" },
  { codigo: "RARJ", nombre: "Resolución que Absuelve el Recurso Jerárquico" },
  { codigo: "RRDL", nombre: "Resolución de Restitución de Derechos Laborales" },
] as const;

export type CodigoTipoNorma = (typeof TIPOS_NORMA)[number]["codigo"];

const NOMBRES_POR_CODIGO = new Map<string, string>(TIPOS_NORMA.map((tipo) => [tipo.codigo, tipo.nombre]));

export function nombreTipoNorma(codigo: string): string {
  return NOMBRES_POR_CODIGO.get(codigo.toUpperCase()) ?? codigo;
}

export function esTipoNormaValido(codigo: string): codigo is CodigoTipoNorma {
  return NOMBRES_POR_CODIGO.has(codigo.toUpperCase());
}

export const EXTENSIONES_PERMITIDAS = ["pdf", "docx", "txt"] as const;

export const MIME_POR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain; charset=utf-8",
};

export interface DatosNomenclatura {
  efecto: string;
  tipoNorma: string;
  numero: string;
  /** Fecha en formato ISO (yyyy-mm-dd), lista para PostgreSQL. */
  fechaPromulgacion: string;
  titulo: string;
  objetoResumido: string;
  materia: string;
  extension: string;
}

export interface ResultadoNomenclatura {
  ok: boolean;
  datos: DatosNomenclatura | null;
  errores: string[];
}

/** Convierte una fecha dd-mm-aaaa (también acepta dd/mm/aaaa) a formato ISO. */
function fechaAIso(texto: string): string | null {
  const coincidencia = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(texto.trim());
  if (!coincidencia) return null;

  const dia = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const anio = Number(coincidencia[3]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  const esValida = fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  if (!esValida) return null;

  return `${anio.toString().padStart(4, "0")}-${mes.toString().padStart(2, "0")}-${dia.toString().padStart(2, "0")}`;
}

/**
 * Analiza el nombre de un archivo de la biblioteca y valida que cumpla la nomenclatura
 * `Efecto; TipoNorma; Número; Fecha; Título; Objeto(Resumido); Materia.ext`.
 */
export function analizarNomenclatura(nombreArchivo: string): ResultadoNomenclatura {
  const errores: string[] = [];

  const puntoFinal = nombreArchivo.lastIndexOf(".");
  const extension = puntoFinal >= 0 ? nombreArchivo.slice(puntoFinal + 1).toLowerCase() : "";
  const base = puntoFinal >= 0 ? nombreArchivo.slice(0, puntoFinal) : nombreArchivo;

  if (!(EXTENSIONES_PERMITIDAS as readonly string[]).includes(extension)) {
    errores.push(`Extensión no permitida: solo se aceptan ${EXTENSIONES_PERMITIDAS.join(", ")}.`);
  }

  const partes = base.split(";").map((parte) => parte.trim());
  if (partes.length !== 7) {
    errores.push(`La nomenclatura requiere 7 campos separados por ";" y se encontraron ${partes.length}.`);
    return { ok: false, datos: null, errores };
  }

  const [efecto, tipoNorma, numero, fechaTexto, titulo, objetoResumido, materia] = partes;

  if (!efecto) errores.push("El campo Efecto está vacío.");
  if (!tipoNorma) {
    errores.push("El campo Tipo de norma está vacío.");
  } else if (!esTipoNormaValido(tipoNorma)) {
    errores.push(
      `Tipo de norma desconocido: "${tipoNorma}". Use uno de: ${TIPOS_NORMA.map((t) => t.codigo).join(", ")}.`,
    );
  }
  if (!numero) errores.push("El campo Número está vacío.");

  const fechaIso = fechaAIso(fechaTexto);
  if (!fechaIso)
    errores.push(`Fecha de promulgación inválida: "${fechaTexto}". Use el formato dd-mm-aaaa (ej.: 02-08-2003).`);

  if (!titulo) errores.push("El campo Título está vacío.");
  if (!objetoResumido) errores.push("El campo Objeto (resumido) está vacío.");
  if (!materia) errores.push("El campo Materia está vacío.");

  if (errores.length > 0) {
    return { ok: false, datos: null, errores };
  }

  return {
    ok: true,
    errores: [],
    datos: {
      efecto,
      tipoNorma: tipoNorma.toUpperCase(),
      numero,
      fechaPromulgacion: fechaIso ?? "",
      titulo,
      objetoResumido,
      materia,
      extension,
    },
  };
}
