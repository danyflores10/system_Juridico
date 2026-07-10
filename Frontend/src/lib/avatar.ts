// Avatares con iniciales de color (estilo Google) para cuando no hay foto.
// El color es determinista según el nombre/correo: la misma persona siempre
// obtiene el mismo color. Se usan fondos sólidos con texto blanco, elegidos
// con buen contraste tanto en tema claro como oscuro.

const PALETA_AVATAR = [
  "#2563eb", // azul
  "#4f46e5", // índigo
  "#7c3aed", // violeta
  "#9333ea", // púrpura
  "#c026d3", // fucsia
  "#db2777", // rosa
  "#e11d48", // carmín
  "#ea580c", // naranja
  "#0d9488", // teal
  "#0891b2", // cian
  "#0284c7", // celeste
  "#059669", // esmeralda
] as const;

/** Hash estable (djb2) para elegir un color determinista a partir de un texto. */
function hashCadena(texto: string): number {
  let hash = 5381;
  for (let i = 0; i < texto.length; i++) {
    hash = (hash * 33) ^ texto.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Color de fondo determinista para el avatar, según el nombre o correo. */
export function colorAvatar(semilla: string): string {
  const clave = semilla.trim().toLowerCase() || "?";
  return PALETA_AVATAR[hashCadena(clave) % PALETA_AVATAR.length];
}

/** Iniciales para el avatar: primera letra del primer y último nombre (máx. 2). */
export function inicialesAvatar(nombre: string, respaldo = ""): string {
  const limpio = nombre.trim();
  // Si no hay nombre pero sí correo, usa la parte anterior a la @.
  const base = limpio || respaldo.trim().split("@")[0];
  const palabras = base.split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}
