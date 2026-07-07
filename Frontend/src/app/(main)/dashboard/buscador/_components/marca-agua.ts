import { APP_CONFIG } from "@/config/app-config";

const TEXTO_MARCA = APP_CONFIG.name.toUpperCase();

/**
 * Compone la captura de pantalla del visor en formato imagen con el logo de la
 * empresa como fondo (requisito anti-piratería del módulo).
 */
export function componerCaptura(origen: HTMLCanvasElement): HTMLCanvasElement {
  const ancho = Math.max(origen.width, 480);
  const altoPie = Math.round(ancho * 0.055);
  const alto = origen.height + altoPie;

  const destino = document.createElement("canvas");
  destino.width = ancho;
  destino.height = alto;

  const contexto = destino.getContext("2d");
  if (!contexto) return destino;

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(origen, Math.round((ancho - origen.width) / 2), 0);

  // Marca de agua diagonal repetida con el logo de la empresa.
  contexto.save();
  contexto.translate(ancho / 2, origen.height / 2);
  contexto.rotate(-Math.PI / 6);
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";

  const tamanoMarca = Math.max(Math.round(ancho / 14), 26);
  contexto.font = `700 ${tamanoMarca}px Arial, sans-serif`;
  contexto.fillStyle = "rgba(30, 41, 59, 0.10)";

  const salto = tamanoMarca * 4;
  for (let fila = -3; fila <= 3; fila += 1) {
    const desplazamiento = fila % 2 === 0 ? 0 : ancho / 4;
    contexto.fillText(TEXTO_MARCA, desplazamiento, fila * salto);
  }
  contexto.restore();

  // Pie institucional de la captura.
  contexto.fillStyle = "#0f172a";
  contexto.fillRect(0, origen.height, ancho, altoPie);

  const tamanoPie = Math.max(Math.round(altoPie * 0.38), 11);
  contexto.font = `600 ${tamanoPie}px Arial, sans-serif`;
  contexto.fillStyle = "#f8fafc";
  contexto.textBaseline = "middle";
  contexto.textAlign = "left";
  contexto.fillText(TEXTO_MARCA, Math.round(ancho * 0.02), origen.height + altoPie / 2);

  contexto.textAlign = "right";
  contexto.font = `400 ${tamanoPie}px Arial, sans-serif`;
  const fecha = new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });
  contexto.fillText(
    `${fecha} - Documento protegido, prohibida su reproducción`,
    Math.round(ancho * 0.98),
    origen.height + altoPie / 2,
  );

  return destino;
}

/** Dibuja un texto plano (TXT/DOCX) en un lienzo para poder capturarlo como imagen. */
export function canvasDesdeTexto(texto: string, titulo: string): HTMLCanvasElement {
  const ancho = 900;
  const margen = 56;
  const tamanoLetra = 15;
  const altoLinea = 24;
  const maximoLineas = 60;

  const lienzoMedicion = document.createElement("canvas");
  const medidor = lienzoMedicion.getContext("2d");

  const lineas: string[] = [];
  if (medidor) {
    medidor.font = `${tamanoLetra}px Georgia, serif`;
    for (const parrafo of texto.split("\n")) {
      let lineaActual = "";
      for (const palabra of parrafo.split(" ")) {
        const tentativa = lineaActual === "" ? palabra : `${lineaActual} ${palabra}`;
        if (medidor.measureText(tentativa).width <= ancho - margen * 2) {
          lineaActual = tentativa;
        } else {
          lineas.push(lineaActual);
          lineaActual = palabra;
        }
        if (lineas.length >= maximoLineas) break;
      }
      if (lineas.length >= maximoLineas) break;
      lineas.push(lineaActual);
    }
  }

  const alto = margen * 2 + 40 + lineas.length * altoLinea;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = Math.max(alto, 300);

  const contexto = lienzo.getContext("2d");
  if (!contexto) return lienzo;

  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, lienzo.width, lienzo.height);

  contexto.fillStyle = "#0f172a";
  contexto.font = "700 19px Georgia, serif";
  contexto.fillText(titulo, margen, margen);

  contexto.font = `${tamanoLetra}px Georgia, serif`;
  contexto.fillStyle = "#1e293b";
  lineas.forEach((linea, indice) => {
    contexto.fillText(linea, margen, margen + 40 + indice * altoLinea);
  });

  return lienzo;
}

/** Descarga un lienzo como archivo PNG. */
export function descargarCanvas(lienzo: HTMLCanvasElement, nombreArchivo: string): void {
  const enlace = document.createElement("a");
  enlace.download = nombreArchivo;
  enlace.href = lienzo.toDataURL("image/png");
  enlace.click();
}
