import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

function limpiarTexto(texto: string): string {
  return texto
    .replace(new RegExp(String.fromCharCode(0), "g"), "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extrae el texto plano de un archivo de la biblioteca para permitir la
 * búsqueda por OBJETO O CONTENIDO RESUMIDO dentro del documento.
 */
export async function extraerTexto(archivo: Buffer, extension: string): Promise<string> {
  const ext = extension.toLowerCase();

  if (ext === "pdf") {
    const analizador = new PDFParse({ data: new Uint8Array(archivo) });
    try {
      const resultado = await analizador.getText();
      return limpiarTexto(resultado.text);
    } finally {
      await analizador.destroy();
    }
  }

  if (ext === "docx") {
    const resultado = await mammoth.extractRawText({ buffer: archivo });
    return limpiarTexto(resultado.value);
  }

  if (ext === "txt") {
    return limpiarTexto(archivo.toString("utf-8"));
  }

  return "";
}
