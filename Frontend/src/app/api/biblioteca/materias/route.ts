import { NextResponse } from "next/server";

import { listarMaterias } from "@/server/biblioteca/consultas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const materias = await listarMaterias();
    return NextResponse.json({ materias });
  } catch (error) {
    console.error("Error al listar materias:", error);
    return NextResponse.json({ error: "No fue posible obtener las materias." }, { status: 500 });
  }
}
