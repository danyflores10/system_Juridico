import type { Carpeta } from "@/data/biblioteca-catalogo";
import { obtenerPool } from "@/server/db";

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

export interface FilaNormativa {
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

/** Marcadores usados por ts_headline; el cliente los convierte en <mark> de forma segura. */
export const MARCA_INICIO = "[[[";
export const MARCA_FIN = "]]]";

const COLUMNAS_RESULTADO = `
  id::int,
  carpeta,
  efecto,
  tipo_norma        AS "tipoNorma",
  numero,
  to_char(fecha_promulgacion, 'YYYY-MM-DD') AS "fechaPromulgacion",
  titulo,
  objeto_resumido   AS "objetoResumido",
  materia,
  nombre_archivo    AS "nombreArchivo",
  extension,
  mime_type         AS "mimeType",
  tamano_bytes::int AS "tamanoBytes",
  to_char(creado_en, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS "creadoEn"
`;

function escaparParaIlike(texto: string): string {
  return texto.replace(/([\\%_])/g, "\\$1");
}

/**
 * Ejecuta la búsqueda del módulo combinando los 6 criterios de la ventana de
 * búsqueda. Los criterios de nombre de archivo (tipo, número, fecha, título,
 * materia) filtran por columnas; el criterio OBJETO O CONTENIDO RESUMIDO usa
 * búsqueda de texto completo en español (sin tildes) dentro del documento.
 */
export async function buscarNormativas(criterios: CriteriosBusqueda): Promise<FilaNormativa[]> {
  const pool = obtenerPool();

  const tipos = criterios.tipos.length > 0 ? criterios.tipos : null;
  const materias = criterios.materias.length > 0 ? criterios.materias : null;
  const numero = escaparParaIlike(criterios.numero.trim());
  const titulo = escaparParaIlike(criterios.titulo.trim());
  const objeto = criterios.objeto.trim();
  const objetoIlike = escaparParaIlike(objeto);

  const { rows } = await pool.query<FilaNormativa>(
    `
    SELECT ${COLUMNAS_RESULTADO},
      CASE
        WHEN $8 <> '' THEN ts_headline(
          'spanish',
          left(coalesce(contenido_texto, ''), 20000),
          websearch_to_tsquery('spanish', $8),
          'StartSel=${MARCA_INICIO}, StopSel=${MARCA_FIN}, MaxWords=28, MinWords=12, MaxFragments=2'
        )
      END AS coincidencia
    FROM public.normativas
    WHERE carpeta = ANY($1)
      AND ($2::text[] IS NULL OR tipo_norma = ANY($2))
      AND ($3::text = ''   OR quitar_tildes(numero) ILIKE '%' || quitar_tildes($3) || '%')
      AND ($4::date IS NULL OR fecha_promulgacion >= $4)
      AND ($5::date IS NULL OR fecha_promulgacion <= $5)
      AND ($6::text = ''   OR quitar_tildes(titulo) ILIKE '%' || quitar_tildes($6) || '%')
      AND ($7::text[] IS NULL OR materia = ANY($7))
      AND (
        $8::text = ''
        OR busqueda @@ websearch_to_tsquery('spanish', quitar_tildes($8))
        OR quitar_tildes(objeto_resumido || ' ' || contenido_texto) ILIKE '%' || quitar_tildes($9) || '%'
      )
    ORDER BY
      CASE
        WHEN $8 <> '' THEN ts_rank(busqueda, websearch_to_tsquery('spanish', quitar_tildes($8)))
      END DESC NULLS LAST,
      fecha_promulgacion DESC,
      id DESC
    LIMIT 500
    `,
    [
      criterios.carpetas,
      tipos,
      numero,
      criterios.fechaDesde,
      criterios.fechaHasta,
      titulo,
      materias,
      objeto,
      objetoIlike,
    ],
  );

  return rows;
}

/** Materias disponibles en la biblioteca (para el check list del criterio v). */
export async function listarMaterias(): Promise<string[]> {
  const pool = obtenerPool();
  const { rows } = await pool.query<{ materia: string }>(
    `SELECT DISTINCT materia FROM public.normativas ORDER BY materia`,
  );
  return rows.map((fila) => fila.materia);
}

export async function registrarBusqueda(
  criterios: CriteriosBusqueda,
  resultados: number,
  planAcceso: string,
): Promise<void> {
  const pool = obtenerPool();
  await pool.query(`INSERT INTO public.busquedas_log (criterios, resultados, plan_acceso) VALUES ($1, $2, $3)`, [
    JSON.stringify(criterios),
    resultados,
    planAcceso,
  ]);
}
