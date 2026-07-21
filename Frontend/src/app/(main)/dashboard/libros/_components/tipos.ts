import type { OrdenLibros } from "@/data/libros-catalogo";

/** Ficha de un libro tal como la devuelve la API del catálogo. */
export interface Libro {
  id: number;
  titulo: string;
  autor: string;
  editorial: string;
  anioPublicacion: number | null;
  edicion: string;
  isbn: string;
  materia: string;
  descripcion: string;
  paginas: number | null;
  nombreArchivo: string;
  extension: string;
  mimeType: string;
  tamanoBytes: number;
  tienePortada: boolean;
  creadoEn: string;
}

export interface FiltrosCatalogo {
  consulta: string;
  materias: string[];
  orden: OrdenLibros;
}

export const FILTROS_INICIALES: FiltrosCatalogo = {
  consulta: "",
  materias: [],
  orden: "recientes",
};
