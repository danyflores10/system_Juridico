import { NextResponse } from "next/server";

import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

/** Entrega la portada del libro (primera página del PDF) para el catálogo. */
export async function GET(_solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<{ portada: Buffer | null; portada_mime: string | null }>(
      `SELECT portada, portada_mime FROM public.libros WHERE id = $1`,
      [idNumerico],
    );

    if (rows.length === 0 || rows[0].portada === null) {
      return NextResponse.json({ error: "El libro no tiene portada." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(rows[0].portada), {
      status: 200,
      headers: {
        "Content-Type": rows[0].portada_mime ?? "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error al entregar la portada del libro:", error);
    return NextResponse.json({ error: "No fue posible obtener la portada." }, { status: 500 });
  }
}
