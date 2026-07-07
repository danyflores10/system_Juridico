import { NextResponse } from "next/server";

import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

export async function DELETE(_solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const pool = obtenerPool();
    const { rowCount } = await pool.query(`DELETE FROM public.normativas WHERE id = $1`, [idNumerico]);

    if (rowCount === 0) {
      return NextResponse.json({ error: "El documento no existe." }, { status: 404 });
    }

    return NextResponse.json({ mensaje: "Documento eliminado de la biblioteca." });
  } catch (error) {
    console.error("Error al eliminar el documento:", error);
    return NextResponse.json({ error: "No fue posible eliminar el documento." }, { status: 500 });
  }
}
