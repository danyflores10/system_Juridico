import type { Carpeta } from "@/data/biblioteca-catalogo";
import { buscarCoincidencias, palabrasClave, type RangoCoincidencia } from "@/lib/texto-busqueda";
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

/** Marcadores del extracto de coincidencia; el cliente los convierte en <mark> de forma segura. */
export const MARCA_INICIO = "[[[";
export const MARCA_FIN = "]]]";

/** Fila cruda de la consulta: el extracto solo se usa para armar la coincidencia. */
type FilaConsulta = Omit<FilaNormativa, "coincidencia"> & { extracto: string | null };

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

/** Fracción mínima de palabras de la consulta que deben aparecer en el documento. */
const FRACCION_MINIMA_PALABRAS = 0.6;

/**
 * Umbral de similitud de trigramas (word_similarity) para dar por buena una
 * palabra escrita con erratas. Calibrado sobre errores reales: las variantes
 * mal escritas (p. ej. "financeras" ≈ "financieras") puntúan ~0.55–0.9 contra
 * el contenido, mientras que palabras ajenas puntúan ~0, así que 0.5 tolera
 * los errores sin traer documentos irrelevantes.
 */
const UMBRAL_ERRATA = 0.5;

/**
 * Ejecuta la búsqueda del módulo combinando los 6 criterios de la ventana de
 * búsqueda. Los criterios de nombre de archivo (tipo, número, fecha, título,
 * materia) filtran por columnas; el criterio OBJETO O CONTENIDO RESUMIDO
 * combina cuatro vías dentro del documento (todas insensibles a tildes):
 *   1. Texto completo en español con todas las palabras (websearch).
 *   2. Frase literal insensible al espaciado, para texto pegado desde un PDF
 *      con saltos de línea.
 *   3. Porcentaje de palabras encontradas, que tolera erratas del documento
 *      o texto extraído con defectos.
 *   4. Similitud de trigramas por palabra (word_similarity): tolera erratas de
 *      quien escribe la consulta ("financeras" encuentra "financieras").
 */
export async function buscarNormativas(criterios: CriteriosBusqueda): Promise<FilaNormativa[]> {
  const pool = obtenerPool();

  const tipos = criterios.tipos.length > 0 ? criterios.tipos : null;
  const materias = criterios.materias.length > 0 ? criterios.materias : null;
  const numero = escaparParaIlike(criterios.numero.trim());
  const titulo = escaparParaIlike(criterios.titulo.trim());
  const objeto = criterios.objeto.trim();
  const objetoIlike = escaparParaIlike(objeto);
  const palabrasObjeto = objeto === "" ? [] : palabrasClave(objeto);
  const minimoPalabras = Math.max(1, Math.ceil(palabrasObjeto.length * FRACCION_MINIMA_PALABRAS));

  const { rows } = await pool.query<FilaConsulta>(
    `
    SELECT ${COLUMNAS_RESULTADO},
      CASE
        WHEN $8 <> '' THEN left(coalesce(objeto_resumido, '') || ' ' || coalesce(contenido_texto, ''), 30000)
      END AS extracto
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
        OR regexp_replace(quitar_tildes(objeto_resumido || ' ' || contenido_texto), '\\s+', ' ', 'g')
           ILIKE '%' || regexp_replace(quitar_tildes($9), '\\s+', ' ', 'g') || '%'
        OR (
          cardinality($10::text[]) > 0
          AND (
            SELECT count(*)
            FROM unnest($10::text[]) AS palabra
            WHERE busqueda @@ plainto_tsquery('spanish', palabra)
          ) >= $11
        )
        OR (
          cardinality($10::text[]) > 0
          AND (
            SELECT count(*)
            FROM unnest($10::text[]) AS palabra
            WHERE word_similarity(palabra, quitar_tildes(coalesce(objeto_resumido, '') || ' ' || coalesce(contenido_texto, ''))) >= $12
          ) >= $11
        )
      )
    ORDER BY
      CASE
        WHEN $8 <> '' THEN ts_rank(busqueda, websearch_to_tsquery('spanish', quitar_tildes($8)))
      END DESC NULLS LAST,
      CASE
        WHEN cardinality($10::text[]) > 0 THEN (
          SELECT count(*)
          FROM unnest($10::text[]) AS palabra
          WHERE busqueda @@ plainto_tsquery('spanish', palabra)
        )
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
      palabrasObjeto,
      minimoPalabras,
      UMBRAL_ERRATA,
    ],
  );

  return rows.map(({ extracto, ...fila }) => ({
    ...fila,
    coincidencia: generarCoincidencia(extracto, objeto),
  }));
}

/** Umbral de similitud (whole-string) para proponer una palabra del corpus como corrección. */
const UMBRAL_SUGERENCIA = 0.4;

/**
 * Propone una consulta corregida cuando la búsqueda por contenido no arroja
 * resultados. Para cada palabra significativa, busca la palabra real más
 * parecida del vocabulario de la biblioteca (similitud de trigramas) y arma la
 * frase corregida. Devuelve null si no hay ninguna corrección que ofrecer.
 */
export async function sugerirConsulta(objeto: string): Promise<string | null> {
  const palabras = palabrasClave(objeto);
  if (palabras.length === 0) return null;

  const pool = obtenerPool();
  const { rows } = await pool.query<{ original: string; sugerida: string }>(
    `
    WITH consulta AS (
      SELECT DISTINCT unnest($1::text[]) AS palabra
    ),
    vocabulario AS (
      SELECT DISTINCT palabra
      FROM public.normativas AS n,
           LATERAL regexp_split_to_table(
             quitar_tildes(lower(coalesce(n.objeto_resumido, '') || ' ' || coalesce(n.contenido_texto, ''))),
             '[^a-z0-9ñ]+'
           ) AS palabra
      WHERE length(palabra) >= 4
    )
    SELECT c.palabra AS original, mejor.palabra AS sugerida
    FROM consulta AS c
    CROSS JOIN LATERAL (
      SELECT v.palabra, similarity(v.palabra, c.palabra) AS sim
      FROM vocabulario AS v
      ORDER BY similarity(v.palabra, c.palabra) DESC, v.palabra
      LIMIT 1
    ) AS mejor
    WHERE mejor.sim >= $2 AND mejor.palabra <> c.palabra
    `,
    [palabras, UMBRAL_SUGERENCIA],
  );

  if (rows.length === 0) return null;

  const correcciones = new Map(rows.map((fila) => [fila.original, fila.sugerida]));
  let huboCambio = false;
  const frase = palabras
    .map((palabra) => {
      const corregida = correcciones.get(palabra);
      if (corregida && corregida !== palabra) {
        huboCambio = true;
        return corregida;
      }
      return palabra;
    })
    .join(" ");

  return huboCambio ? frase : null;
}

/** Cantidad de caracteres de contexto alrededor de la coincidencia en el extracto. */
const CONTEXTO_EXTRACTO = 110;
/** Ancho máximo de la ventana donde se agrupan coincidencias del extracto. */
const VENTANA_EXTRACTO = 320;

/**
 * Genera el extracto con marcadores de resaltado para la tabla de resultados.
 * Primero intenta ubicar la frase completa (insensible a tildes, mayúsculas y
 * saltos de línea); si no aparece literal, resalta las palabras de la consulta
 * en la zona del documento donde más se concentran.
 */
function generarCoincidencia(extracto: string | null, consulta: string): string | null {
  if (!extracto || consulta.trim() === "") return null;

  const frases = buscarCoincidencias(extracto, consulta);
  if (frases.length > 0) {
    // La primera coincidencia siempre se conserva, aunque exceda la ventana.
    const enVentana = frases.filter(
      (rango, indice) => indice === 0 || rango.fin <= frases[0].inicio + VENTANA_EXTRACTO,
    );
    return construirExtracto(extracto, enVentana);
  }

  const palabras = palabrasClave(consulta);
  if (palabras.length === 0) return null;

  const rangos: RangoCoincidencia[] = [];
  for (const palabra of palabras) {
    rangos.push(...buscarCoincidencias(extracto, palabra));
  }
  if (rangos.length === 0) return null;

  rangos.sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);
  const acotados = rangos.slice(0, 200);

  // Busca la ventana con mayor cantidad de palabras de la consulta.
  let mejorIndice = 0;
  let mejorCantidad = 0;
  for (let i = 0; i < acotados.length; i++) {
    let cantidad = 0;
    for (let j = i; j < acotados.length && acotados[j].fin <= acotados[i].inicio + VENTANA_EXTRACTO; j++) {
      cantidad++;
    }
    if (cantidad > mejorCantidad) {
      mejorCantidad = cantidad;
      mejorIndice = i;
    }
  }

  const inicioVentana = acotados[mejorIndice].inicio;
  const enVentana = acotados.filter(
    (rango) => rango.inicio >= inicioVentana && rango.fin <= inicioVentana + VENTANA_EXTRACTO,
  );
  return construirExtracto(extracto, enVentana.length > 0 ? enVentana : [acotados[mejorIndice]]);
}

/** Arma el texto del extracto envolviendo cada rango con los marcadores. */
function construirExtracto(texto: string, rangos: RangoCoincidencia[]): string {
  const compactar = (fragmento: string) => fragmento.replace(/\s+/g, " ");

  const inicio = Math.max(0, rangos[0].inicio - CONTEXTO_EXTRACTO);
  const fin = Math.min(texto.length, rangos[rangos.length - 1].fin + CONTEXTO_EXTRACTO);

  const partes: string[] = [];
  if (inicio > 0) partes.push("… ");

  let cursor = inicio;
  for (const rango of rangos) {
    if (rango.inicio < cursor) continue; // evita rangos traslapados
    partes.push(compactar(texto.slice(cursor, rango.inicio)));
    partes.push(MARCA_INICIO + compactar(texto.slice(rango.inicio, rango.fin)) + MARCA_FIN);
    cursor = rango.fin;
  }
  partes.push(compactar(texto.slice(cursor, fin)));

  if (fin < texto.length) partes.push(" …");
  return partes.join("");
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
