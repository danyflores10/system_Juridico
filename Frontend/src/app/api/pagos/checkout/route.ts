import { type NextRequest, NextResponse } from "next/server";

import { getDjangoBaseUrl } from "@/server/auth/session";

/**
 * Checkout público de suscripciones (Módulo 3: Gestión de Pagos).
 *
 * Reenvía la solicitud al backend, que valida los datos, resuelve el precio
 * desde el catálogo (nunca del cliente) y registra la deuda en Libélula.
 * Devuelve la URL de la pasarela a la que se redirige al cliente.
 */
export async function POST(request: NextRequest) {
  const cuerpo: unknown = await request.json().catch(() => null);
  if (!cuerpo || typeof cuerpo !== "object") {
    return NextResponse.json({ detail: "Solicitud inválida." }, { status: 400 });
  }

  const respuesta = await fetch(`${getDjangoBaseUrl()}/suscripciones/checkout/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(cuerpo),
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
