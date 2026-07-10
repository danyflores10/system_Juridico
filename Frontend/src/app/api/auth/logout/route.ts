import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE, getDjangoBaseUrl, REFRESH_COOKIE } from "@/server/auth/session";

export async function POST() {
  const almacen = await cookies();
  const refresh = almacen.get(REFRESH_COOKIE)?.value;

  // Invalida el refresh token en el backend (blacklist): cierra la sesión de verdad,
  // no solo en el navegador. Aunque falle, igual limpiamos las cookies locales.
  if (refresh) {
    await fetch(`${getDjangoBaseUrl()}/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    }).catch(() => null);
  }

  const salida = NextResponse.json({ ok: true });
  salida.cookies.delete(ACCESS_COOKIE);
  salida.cookies.delete(REFRESH_COOKIE);
  return salida;
}
