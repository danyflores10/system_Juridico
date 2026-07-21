import type { OrdenLibros } from "@/data/libros-catalogo";
import { obtenerPool } from "@/server/db";

export interface FilaLibro {
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

export interface FiltrosLibros {
  /** Texto libre: busca en título, autor, materia, descripción y contenido. */
  consulta: string;
  materias: string[];
  orden: OrdenLibros;
}

/** Columnas del listado: nunca incluyen el archivo ni el texto completo. */
const COLUMNAS_LIBRO = `
  id::int,
  titulo,
  autor,
  editorial,
  anio_publicacion::int AS "anioPublicacion",
  edicion,
  isbn,
  materia,
  descripcion,
  paginas::int,
  nombre_archivo   AS "nombreArchivo",
  extension,
  mime_type        AS "mimeType",
  tamano_bytes::int AS "tamanoBytes",
  (portada IS NOT NULL) AS "tienePortada",
  to_char(creado_en, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS "creadoEn"
`;

/** Cláusula ORDER BY según la opción elegida en el catálogo. */
const ORDEN_SQL: Record<OrdenLibros, string> = {
  recientes: "creado_en DESC, id DESC",
  titulo: "titulo ASC, id DESC",
  autor: "autor ASC, titulo ASC",
  anio: "anio_publicacion DESC NULLS LAST, titulo ASC",
};

function escaparParaIlike(texto: string): string {
  return texto.replace(/([\\%_])/g, "\\$1");
}

/**
 * Lista los libros del catálogo. La consulta de texto combina dos vías, ambas
 * insensibles a tildes: búsqueda en español sobre el vector (que incluye el
 * contenido del libro) y coincidencia literal en los campos de la ficha, para
 * que escribir parte de un título o de un autor siempre encuentre el libro.
 */
export async function listarLibros(filtros: FiltrosLibros): Promise<FilaLibro[]> {
  const pool = obtenerPool();

  const consulta = filtros.consulta.trim();
  const consultaIlike = escaparParaIlike(consulta);
  const materias = filtros.materias.length > 0 ? filtros.materias : null;

  const { rows } = await pool.query<FilaLibro>(
    `
    SELECT ${COLUMNAS_LIBRO}
    FROM public.libros
    WHERE ($1::text[] IS NULL OR materia = ANY($1))
      AND (
        $2::text = ''
        OR busqueda @@ websearch_to_tsquery('spanish', quitar_tildes($2))
        OR quitar_tildes(titulo || ' ' || autor || ' ' || editorial || ' ' || materia || ' ' || isbn)
           ILIKE '%' || quitar_tildes($3) || '%'
      )
    ORDER BY ${ORDEN_SQL[filtros.orden]}
    LIMIT 500
    `,
    [materias, consulta, consultaIlike],
  );

  return rows;
}

export async function obtenerLibro(id: number): Promise<FilaLibro | null> {
  const pool = obtenerPool();
  const { rows } = await pool.query<FilaLibro>(`SELECT ${COLUMNAS_LIBRO} FROM public.libros WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

/** Materias presentes en el catálogo, para armar el filtro. */
export async function listarMateriasLibros(): Promise<string[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ materia: string }>(
    `SELECT DISTINCT materia FROM public.libros WHERE materia <> '' ORDER BY materia`,
  );
  return rows.map((fila) => fila.materia);
}
