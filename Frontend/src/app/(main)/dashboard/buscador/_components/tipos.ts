import type { Carpeta } from "@/data/biblioteca-catalogo";

/** Opciones de despliegue de normativa del módulo: gratuita o por suscripción. */
export type PlanAcceso = "gratuita" | "suscripcion";

export interface CriteriosBusqueda {
  tipos: string[];
  numero: string;
  fechaDesde: string | null;
  fechaHasta: string | null;
  titulo: string;
  materias: string[];
  objeto: string;
  carpetas: Carpeta[];
}

export const CRITERIOS_INICIALES: CriteriosBusqueda = {
  tipos: [],
  numero: "",
  fechaDesde: null,
  fechaHasta: null,
  titulo: "",
  materias: [],
  objeto: "",
  carpetas: ["EMITIDA", "ACTUALIZADA"],
};

export interface ResultadoNormativa {
  id: number;
  carpeta: Carpeta;
  efecto: string;
  tipoNorma: string;
  numero: string;
  fechaPromulgacion: string;
  titulo: string;
  objetoResumido: string;
  materia: string;
  nombreArchivo: string;
  extension: string;
  mimeType: string;
  tamanoBytes: number;
  creadoEn: string;
  coincidencia: string | null;
}

export function estaBloqueado(documento: ResultadoNormativa, plan: PlanAcceso): boolean {
  return documento.carpeta === "ACTUALIZADA" && plan !== "suscripcion";
}
