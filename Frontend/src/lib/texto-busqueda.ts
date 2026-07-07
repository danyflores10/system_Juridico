/**
 * Utilidades de búsqueda de texto insensibles a mayúsculas, tildes y
 * espaciado (saltos de línea, tabulaciones, espacios repetidos).
 *
 * Se usan en dos lugares:
 *  - En el servidor, para generar el extracto resaltado de los resultados.
 *  - En el visor de documentos, para la búsqueda interna (Ctrl+F) del PDF.
 */

export interface TextoNormalizado {
  /** Texto en minúsculas, sin tildes y con el espaciado colapsado a un espacio. */
  texto: string;
  /** Índice en el texto original de cada carácter del texto normalizado. */
  mapa: number[];
}

export interface RangoCoincidencia {
  /** Posición inicial (inclusiva) dentro del texto original. */
  inicio: number;
  /** Posición final (exclusiva) dentro del texto original. */
  fin: number;
}

const ESPACIO = /\s/;
const DIACRITICOS = /[̀-ͯ]/g;

/**
 * Normaliza un texto conservando, por cada carácter resultante, su posición en
 * el texto original. Así "Código\n  Tributario" y "codigo tributario" se
 * comparan igual y las coincidencias pueden resaltarse sobre el texto original.
 */
export function normalizarTexto(original: string): TextoNormalizado {
  let texto = "";
  const mapa: number[] = [];
  let enEspacio = true; // descarta también los espacios iniciales

  for (let indice = 0; indice < original.length; indice++) {
    const caracter = original[indice];

    if (ESPACIO.test(caracter)) {
      if (!enEspacio) {
        texto += " ";
        mapa.push(indice);
        enEspacio = true;
      }
      continue;
    }

    enEspacio = false;
    const normalizado = caracter.normalize("NFD").replace(DIACRITICOS, "").toLowerCase();
    for (const parte of normalizado) {
      texto += parte;
      mapa.push(indice);
    }
  }

  return { texto, mapa };
}

/**
 * Busca todas las apariciones de la consulta dentro del texto original y
 * devuelve los rangos en coordenadas del texto original (para resaltar).
 * La comparación ignora mayúsculas, tildes y diferencias de espaciado.
 */
export function buscarCoincidencias(original: string, consulta: string): RangoCoincidencia[] {
  const objetivo = normalizarTexto(original);
  const termino = normalizarTexto(consulta).texto.trim();
  if (termino.length === 0) return [];

  const rangos: RangoCoincidencia[] = [];
  let desde = 0;

  for (;;) {
    const posicion = objetivo.texto.indexOf(termino, desde);
    if (posicion === -1) break;

    rangos.push({
      inicio: objetivo.mapa[posicion],
      fin: objetivo.mapa[posicion + termino.length - 1] + 1,
    });
    desde = posicion + termino.length;
  }

  return rangos;
}

/** Palabras frecuentes del español que no aportan al resaltado por palabras. */
const PALABRAS_VACIAS = new Set([
  "las",
  "los",
  "una",
  "unas",
  "uno",
  "unos",
  "del",
  "con",
  "como",
  "por",
  "para",
  "que",
  "este",
  "esta",
  "estos",
  "estas",
  "ese",
  "esa",
  "sus",
  "son",
  "ser",
  "esta",
  "entre",
  "sobre",
  "cada",
  "desde",
  "hasta",
  "donde",
  "cuando",
  "tambien",
  "segun",
  "asi",
  "mas",
  "sin",
  "tiene",
  "presente",
]);

/**
 * Extrae las palabras significativas de una consulta (sin tildes, en
 * minúsculas, de 3+ caracteres y sin palabras vacías) para el resaltado
 * palabra por palabra cuando la frase completa no aparece literal.
 */
export function palabrasClave(consulta: string): string[] {
  const { texto } = normalizarTexto(consulta);
  const palabras = texto
    .split(" ")
    .map((palabra) => palabra.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter((palabra) => palabra.length >= 3);

  const significativas = [...new Set(palabras.filter((palabra) => !PALABRAS_VACIAS.has(palabra)))];
  if (significativas.length > 0) return significativas;

  // Si la consulta solo tiene palabras comunes, se usan igualmente.
  return [...new Set(palabras)];
}
