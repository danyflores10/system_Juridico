import { NextResponse } from "next/server";

import {
  ANIO_MINIMO_LIBRO,
  anioMaximoLibro,
  esExtensionPermitida,
  esOrdenLibros,
  extensionDeArchivo,
  MIME_POR_EXTENSION_LIBRO,
  type OrdenLibros,
  TAMANO_MAXIMO_LIBRO,
} from "@/data/libros-catalogo";
import { extraerTexto } from "@/server/biblioteca/extraer-texto";
import { listarLibros } from "@/server/biblioteca/libros";
import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

/** Portadas admitidas (las genera el navegador desde la primera página del PDF). */
const MIMES_PORTADA = ["image/png", "image/jpeg", "image/webp"];
const TAMANO_MAXIMO_PORTADA = 3 * 1024 * 1024;

/** Lista el catálogo de libros con búsqueda por texto, filtro de materia y orden. */
export async function GET(solicitud: Request) {
  const parametros = new URL(solicitud.url).searchParams;
  const ordenPedido = parametros.get("orden") ?? "recientes";
  const orden: OrdenLibros = esOrdenLibros(ordenPedido) ? ordenPedido : "recientes";

  try {
    const libros = await listarLibros({
      consulta: parametros.get("q") ?? "",
      materias: parametros.getAll("materia").filter((materia) => materia.trim() !== ""),
      orden,
    });

    return NextResponse.json({ libros });
  } catch (error) {
    console.error("Error al listar los libros:", error);
    return NextResponse.json({ error: "No fue posible obtener el catálogo de libros." }, { status: 500 });
  }
}

/** Devuelve el texto de un campo del formulario, ya recortado. */
function campoTexto(formulario: FormData, nombre: string): string {
  const valor = formulario.get(nombre);
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Incorpora un libro al catálogo. A diferencia de las normativas, los datos no
 * salen del nombre del archivo sino de la ficha que llena el usuario; del
 * contenido se extrae el texto para poder buscar dentro del libro.
 */
export async function POST(solicitud: Request) {
  let formulario: FormData;
  try {
    formulario = await solicitud.formData();
  } catch {
    return NextResponse.json({ error: "La solicitud debe enviarse como multipart/form-data." }, { status: 400 });
  }

  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Debe adjuntar el archivo del libro." }, { status: 400 });
  }
  if (archivo.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_LIBRO) {
    return NextResponse.json(
      { error: `El archivo supera el tamaño máximo de ${Math.round(TAMANO_MAXIMO_LIBRO / (1024 * 1024))} MB.` },
      { status: 400 },
    );
  }

  const extension = extensionDeArchivo(archivo.name);
  if (!esExtensionPermitida(extension)) {
    return NextResponse.json({ error: "Solo se admiten archivos PDF, DOCX o TXT." }, { status: 415 });
  }

  const titulo = campoTexto(formulario, "titulo");
  const autor = campoTexto(formulario, "autor");
  const materia = campoTexto(formulario, "materia");
  const anioTexto = campoTexto(formulario, "anioPublicacion");
  const paginasTexto = campoTexto(formulario, "paginas");

  const faltantes: string[] = [];
  if (titulo === "") faltantes.push("El título es obligatorio.");
  if (autor === "") faltantes.push("El autor es obligatorio.");
  if (materia === "") faltantes.push("La materia es obligatoria.");
  if (faltantes.length > 0) {
    return NextResponse.json({ error: "Faltan datos de la ficha del libro.", detalles: faltantes }, { status: 422 });
  }

  let anioPublicacion: number | null = null;
  if (anioTexto !== "") {
    const anio = Number(anioTexto);
    if (!Number.isInteger(anio) || anio < ANIO_MINIMO_LIBRO || anio > anioMaximoLibro()) {
      return NextResponse.json(
        { error: `El año de publicación debe estar entre ${ANIO_MINIMO_LIBRO} y ${anioMaximoLibro()}.` },
        { status: 422 },
      );
    }
    anioPublicacion = anio;
  }

  let paginas: number | null = null;
  if (paginasTexto !== "") {
    const total = Number(paginasTexto);
    if (Number.isInteger(total) && total > 0) paginas = total;
  }

  // La portada es opcional: si no llega o no es una imagen válida, el catálogo
  // muestra una carátula generada con el título.
  let portada: Buffer | null = null;
  let portadaMime: string | null = null;
  const portadaEnviada = formulario.get("portada");
  if (
    portadaEnviada instanceof File &&
    portadaEnviada.size > 0 &&
    portadaEnviada.size <= TAMANO_MAXIMO_PORTADA &&
    MIMES_PORTADA.includes(portadaEnviada.type)
  ) {
    portada = Buffer.from(await portadaEnviada.arrayBuffer());
    portadaMime = portadaEnviada.type;
  }

  const contenido = Buffer.from(await archivo.arrayBuffer());

  let contenidoTexto = "";
  try {
    contenidoTexto = await extraerTexto(contenido, extension);
  } catch (error) {
    console.error("No fue posible extraer el texto del libro:", error);
  }

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<{ id: number }>(
      `
      INSERT INTO public.libros (
        titulo, autor, editorial, anio_publicacion, edicion, isbn, materia,
        descripcion, paginas, nombre_archivo, extension, mime_type,
        tamano_bytes, contenido_texto, archivo, portada, portada_mime
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id
      `,
      [
        titulo,
        autor,
        campoTexto(formulario, "editorial"),
        anioPublicacion,
        campoTexto(formulario, "edicion"),
        campoTexto(formulario, "isbn"),
        materia,
        campoTexto(formulario, "descripcion"),
        paginas,
        archivo.name,
        extension,
        MIME_POR_EXTENSION_LIBRO[extension] ?? "application/octet-stream",
        archivo.size,
        contenidoTexto,
        contenido,
        portada,
        portadaMime,
      ],
    );

    return NextResponse.json({ id: rows[0].id, mensaje: "Libro incorporado al catálogo." }, { status: 201 });
  } catch (error) {
    const codigo = (error as { code?: string }).code;
    if (codigo === "23505") {
      return NextResponse.json(
        { error: "Ya existe un libro con ese mismo título y autor en el catálogo." },
        { status: 409 },
      );
    }

    console.error("Error al guardar el libro:", error);
    return NextResponse.json({ error: "No fue posible guardar el libro en el catálogo." }, { status: 500 });
  }
}
