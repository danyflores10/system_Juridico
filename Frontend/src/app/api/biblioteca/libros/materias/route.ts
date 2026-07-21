import { NextResponse } from "next/server";

import { listarMateriasLibros } from "@/server/biblioteca/libros";

export const runtime = "nodejs";

/** Materias presentes en el catálogo de libros, para armar el filtro. */
export async function GET() {
  try {
    const materias = await listarMateriasLibros();
    return NextResponse.json({ materias });
  } catch (error) {
    console.error("Error al listar las materias de los libros:", error);
    return NextResponse.json({ error: "No fue posible obtener las materias." }, { status: 500 });
  }
}
