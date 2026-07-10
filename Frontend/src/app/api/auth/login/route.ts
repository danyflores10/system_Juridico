import { NextResponse } from "next/server";

import { ACCESS_COOKIE, cookieOptions, getDjangoBaseUrl, REFRESH_COOKIE } from "@/server/auth/session";

const TREINTA_DIAS_SEGUNDOS = 30 * 24 * 60 * 60;

export async function POST(request: Request) {
  let cuerpo: { email?: string; password?: string; remember?: boolean };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ detail: "Solicitud inválida." }, { status: 400 });
  }

  const respuesta = await fetch(`${getDjangoBaseUrl()}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cuerpo.email, password: cuerpo.password }),
    cache: "no-store",
  }).catch(() => null);

  if (!respuesta) {
    return NextResponse.json(
      { detail: "No se pudo conectar con el servidor. Verifica que el backend esté activo." },
      { status: 502 },
    );
  }

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    return NextResponse.json(datos ?? { detail: "Error de autenticación." }, { status: respuesta.status });
  }

  const { usuario, tokens } = datos as {
    usuario: unknown;
    tokens: { access: string; refresh: string };
  };

  const salida = NextResponse.json({ usuario });
  // "Recordarme": cookies persistentes por 30 días; si no, cookies de sesión.
  const persistencia = cuerpo.remember ? { maxAge: TREINTA_DIAS_SEGUNDOS } : {};
  salida.cookies.set(ACCESS_COOKIE, tokens.access, { ...cookieOptions, ...persistencia });
  salida.cookies.set(REFRESH_COOKIE, tokens.refresh, { ...cookieOptions, ...persistencia });
  return salida;
}
