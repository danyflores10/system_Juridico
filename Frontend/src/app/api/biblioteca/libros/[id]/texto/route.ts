import { NextResponse } from "next/server";

import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

/** Entrega el texto extraído del libro, para leer archivos DOCX y TXT en el visor. */
export async function GET(_solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<{ contenido_texto: string }>(
      `SELECT contenido_texto FROM public.libros WHERE id = $1`,
      [idNumerico],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "El libro no existe." }, { status: 404 });
    }

    return NextResponse.json({ texto: rows[0].contenido_texto });
  } catch (error) {
    console.error("Error al entregar el texto del libro:", error);
    return NextResponse.json({ error: "No fue posible obtener el texto del libro." }, { status: 500 });
  }
}
