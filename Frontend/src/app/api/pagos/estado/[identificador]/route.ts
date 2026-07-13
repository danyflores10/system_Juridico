import { type NextRequest, NextResponse } from "next/server";

import { getDjangoBaseUrl } from "@/server/auth/session";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Estado de un pago para la página de retorno de la pasarela.
 * El identificador es un UUID no adivinable generado por el backend.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ identificador: string }> }) {
  const { identificador } = await params;
  if (!UUID_REGEX.test(identificador)) {
    return NextResponse.json({ detail: "Identificador inválido." }, { status: 400 });
  }

  const respuesta = await fetch(`${getDjangoBaseUrl()}/suscripciones/pagos/${identificador}/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  }).catch(() => null);

  if (!respuesta) {
    return NextResponse.json(
      { detail: "No se pudo conectar con el servidor. Inténtalo nuevamente en unos minutos." },
      { status: 502 },
    );
  }

  const datos: unknown = await respuesta.json().catch(() => null);
  return NextResponse.json(datos ?? { detail: "Respuesta inválida del servidor." }, {
    status: respuesta.status,
  });
}
