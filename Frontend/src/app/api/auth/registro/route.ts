import { NextResponse } from "next/server";

import { ACCESS_COOKIE, cookieOptions, getDjangoBaseUrl, REFRESH_COOKIE } from "@/server/auth/session";

export async function POST(request: Request) {
  let cuerpo: { email?: string; password?: string; nombre?: string; apellido?: string };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ detail: "Solicitud inválida." }, { status: 400 });
  }

  const respuesta = await fetch(`${getDjangoBaseUrl()}/auth/registro/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
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
    return NextResponse.json(datos ?? { detail: "Error en el registro." }, { status: respuesta.status });
  }

  const { usuario, tokens } = datos as {
    usuario: unknown;
    tokens: { access: string; refresh: string };
  };

  const salida = NextResponse.json({ usuario }, { status: 201 });
  salida.cookies.set(ACCESS_COOKIE, tokens.access, cookieOptions);
  salida.cookies.set(REFRESH_COOKIE, tokens.refresh, cookieOptions);
  return salida;
}
