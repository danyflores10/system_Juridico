import { NextResponse } from "next/server";

import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

interface FilaArchivo {
  carpeta: "EMITIDA" | "ACTUALIZADA";
  nombre_archivo: string;
  mime_type: string;
  archivo: Buffer;
}

/**
 * Entrega el archivo original de una normativa.
 *
 * Reglas de acceso del módulo:
 * - NORMATIVA EMITIDA: visible para todos (opción gratuita) y descargable.
 * - NORMATIVA ACTUALIZADA: solo visible con suscripción y NUNCA descargable
 *   (restricción de copia); únicamente se visualiza dentro del visor.
 */
export async function GET(solicitud: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  const idNumerico = Number(id);

  if (!Number.isInteger(idNumerico) || idNumerico <= 0) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const parametros = new URL(solicitud.url).searchParams;
  const plan = parametros.get("plan") === "suscripcion" ? "suscripcion" : "gratuita";
  const comoDescarga = parametros.get("descarga") === "1";

  try {
    const pool = obtenerPool();
    const { rows } = await pool.query<FilaArchivo>(
      `SELECT carpeta, nombre_archivo, mime_type, archivo FROM public.normativas WHERE id = $1`,
      [idNumerico],
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "El documento no existe." }, { status: 404 });
    }

    const fila = rows[0];

    if (fila.carpeta === "ACTUALIZADA" && plan !== "suscripcion") {
      return NextResponse.json(
        { error: "La normativa actualizada está disponible únicamente con la opción de suscripción." },
        { status: 403 },
      );
    }

    if (fila.carpeta === "ACTUALIZADA" && comoDescarga) {
      return NextResponse.json(
        { error: "La normativa actualizada tiene restricción de copia: solo puede visualizarse." },
        { status: 403 },
      );
    }

    const disposicion = comoDescarga ? "attachment" : "inline";
    const nombreSeguro = encodeURIComponent(fila.nombre_archivo);

    return new NextResponse(new Uint8Array(fila.archivo), {
      status: 200,
      headers: {
        "Content-Type": fila.mime_type,
        "Content-Disposition": `${disposicion}; filename*=UTF-8''${nombreSeguro}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Error al entregar el archivo:", error);
    return NextResponse.json({ error: "No fue posible obtener el archivo." }, { status: 500 });
  }
}
