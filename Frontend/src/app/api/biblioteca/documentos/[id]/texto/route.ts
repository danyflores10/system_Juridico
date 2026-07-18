import { NextResponse } from "next/server";

import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

/**
 * Entrega el texto extraído de un documento (para previsualizar archivos
 * DOCX y TXT en el visor). Aplica las mismas reglas de acceso que el archivo.
 */
export async function GET(solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const plan = new URL(solicitud.url).searchParams.get("plan") === "suscripcion" ? "suscripcion" : "gratuita";

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<{ carpeta: string; contenido_texto: string }>(
      `SELECT carpeta, contenido_texto FROM public.normativas WHERE id = $1`,
      [idNumerico],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "El documento no existe." }, { status: 404 });
    }

    if (rows[0].carpeta === "ACTUALIZADA" && plan !== "suscripcion") {
      return NextResponse.json(
        { error: "La normativa actualizada está disponible únicamente con la opción de suscripción." },
        { status: 403 },
      );
    }

    return NextResponse.json({ texto: rows[0].contenido_texto });
  } catch (error) {
    console.error("Error al entregar el texto del documento:", error);
    return NextResponse.json({ error: "No fue posible obtener el texto del documento." }, { status: 500 });
  }
}
