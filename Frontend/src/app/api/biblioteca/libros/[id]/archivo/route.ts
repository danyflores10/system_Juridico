import { NextResponse } from "next/server";

import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

interface FilaArchivoLibro {
  nombre_archivo: string;
  mime_type: string;
  archivo: Buffer;
}

/**
 * Entrega el archivo de un libro para leerlo dentro del visor protegido.
 *
 * Los libros del catálogo son de SOLO LECTURA: siempre se sirven en línea, con
 * `Content-Disposition: inline` y sin caché, de modo que no exista una vía de
 * descarga directa desde la aplicación.
 */
export async function GET(_solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<FilaArchivoLibro>(
      `SELECT nombre_archivo, mime_type, archivo FROM public.libros WHERE id = $1`,
      [idNumerico],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "El libro no existe." }, { status: 404 });
    }

    const fila = rows[0];
    return new NextResponse(new Uint8Array(fila.archivo), {
      status: 200,
      headers: {
        "Content-Type": fila.mime_type,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fila.nombre_archivo)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error al entregar el archivo del libro:", error);
    return NextResponse.json({ error: "No fue posible obtener el archivo del libro." }, { status: 500 });
  }
}
