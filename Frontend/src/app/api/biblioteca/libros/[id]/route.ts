import { NextResponse } from "next/server";

import { obtenerLibro } from "@/server/biblioteca/libros";
import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

/** Ficha de un libro (sin el archivo ni el texto completo). */
export async function GET(_solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const libro = await obtenerLibro(idNumerico);
    if (!libro) return NextResponse.json({ error: "El libro no existe." }, { status: 404 });
    return NextResponse.json({ libro });
  } catch (error) {
    console.error("Error al obtener el libro:", error);
    return NextResponse.json({ error: "No fue posible obtener el libro." }, { status: 500 });
  }
}

/** Retira un libro del catálogo. */
export async function DELETE(_solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const pool = obtenerPool();
    const { rowCount } = await pool.query(`DELETE FROM public.libros WHERE id = $1`, [idNumerico]);

    if (rowCount === 0) {
      return NextResponse.json({ error: "El libro no existe." }, { status: 404 });
    }

    return NextResponse.json({ mensaje: "Libro retirado del catálogo." });
  } catch (error) {
    console.error("Error al eliminar el libro:", error);
    return NextResponse.json({ error: "No fue posible eliminar el libro." }, { status: 500 });
  }
}
