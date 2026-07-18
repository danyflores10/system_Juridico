import { NextResponse } from "next/server";

import { analizarNomenclatura, MIME_POR_EXTENSION } from "@/data/biblioteca-catalogo";
import { extraerTexto } from "@/server/biblioteca/extraer-texto";
import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;

/**
 * Incorpora un archivo a la BIBLIOTECA. El nombre del archivo debe cumplir la
 * nomenclatura `Efecto; TipoNorma; Número; Fecha; Título; Objeto; Materia.ext`;
 * de él se extraen los criterios de búsqueda y del contenido el texto completo.
 */
export async function POST(solicitud: Request) {
  let formulario: FormData;
  try {
    formulario = await solicitud.formData();
  } catch {
    return NextResponse.json({ error: "La solicitud debe enviarse como multipart/form-data." }, { status: 400 });
  }

  const archivo = formulario.get("archivo");
  const carpeta = formulario.get("carpeta");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Debe adjuntar un archivo en el campo 'archivo'." }, { status: 400 });
  }
  if (carpeta !== "EMITIDA" && carpeta !== "ACTUALIZADA") {
    return NextResponse.json({ error: "La carpeta debe ser EMITIDA o ACTUALIZADA." }, { status: 400 });
  }
  if (archivo.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo supera el tamaño máximo de 25 MB." }, { status: 400 });
  }

  const nomenclatura = analizarNomenclatura(archivo.name);
  if (!nomenclatura.ok || nomenclatura.datos === null) {
    return NextResponse.json(
      { error: "El nombre del archivo no cumple la nomenclatura de la biblioteca.", detalles: nomenclatura.errores },
      { status: 422 },
    );
  }

  const datos = nomenclatura.datos;
  const contenido = Buffer.from(await archivo.arrayBuffer());

  let contenidoTexto = "";
  try {
    contenidoTexto = await extraerTexto(contenido, datos.extension);
  } catch (error) {
    console.error("No fue posible extraer el texto del archivo:", error);
  }

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<{ id: number }>(
      `
      INSERT INTO public.normativas (
        carpeta, efecto, tipo_norma, numero, fecha_promulgacion, titulo,
        objeto_resumido, materia, nombre_archivo, extension, mime_type,
        tamano_bytes, contenido_texto, archivo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
      `,
      [
        carpeta,
        datos.efecto,
        datos.tipoNorma,
        datos.numero,
        datos.fechaPromulgacion,
        datos.titulo,
        datos.objetoResumido,
        datos.materia,
        archivo.name,
        datos.extension,
        MIME_POR_EXTENSION[datos.extension] ?? "application/octet-stream",
        archivo.size,
        contenidoTexto,
        contenido,
      ],
    );

    return NextResponse.json({ id: rows[0].id, mensaje: "Documento incorporado a la biblioteca." }, { status: 201 });
  } catch (error) {
    const codigo = (error as { code?: string }).code;
    if (codigo === "23505") {
      return NextResponse.json(
        { error: "Ya existe un archivo con ese nombre en la carpeta seleccionada." },
        { status: 409 },
      );
    }

    console.error("Error al guardar el documento:", error);
    return NextResponse.json({ error: "No fue posible guardar el documento en la biblioteca." }, { status: 500 });
  }
}
