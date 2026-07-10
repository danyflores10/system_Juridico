import { type NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, cookieOptions, getDjangoBaseUrl, REFRESH_COOKIE, renovarTokens } from "@/server/auth/session";

// Prefijos del API de Django que este proxy autenticado puede alcanzar.
const PREFIJOS_PERMITIDOS = ["usuarios", "auth/perfil", "auth/cambiar-password"];

async function manejar(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const destino = path.join("/");
  if (!PREFIJOS_PERMITIDOS.some((prefijo) => destino === prefijo || destino.startsWith(`${prefijo}/`))) {
    return NextResponse.json({ detail: "Ruta no permitida." }, { status: 404 });
  }

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) {
    return NextResponse.json({ detail: "No autenticado." }, { status: 401 });
  }

  const url = `${getDjangoBaseUrl()}/${destino}/${request.nextUrl.search}`;
  const cuerpo = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();

  const ejecutar = async (token: string) =>
    fetch(url, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(cuerpo ? { "Content-Type": "application/json" } : {}),
      },
      body: cuerpo || undefined,
      cache: "no-store",
    });

  let tokensNuevos: { access: string; refresh: string } | null = null;
  let respuesta = access ? await ejecutar(access).catch(() => null) : null;

  // Si el access expiró (o no existía), renueva con el refresh y reintenta una vez.
  if ((!respuesta || respuesta.status === 401) && refresh) {
    tokensNuevos = await renovarTokens(refresh);
    if (tokensNuevos) {
      respuesta = await ejecutar(tokensNuevos.access).catch(() => null);
    }
  }

  if (!respuesta) {
    return NextResponse.json(
      { detail: "No se pudo conectar con el servidor. Verifica que el backend esté activo." },
      { status: 502 },
    );
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  const salida =
    datos === null && respuesta.status === 204
      ? new NextResponse(null, { status: 204 })
      : NextResponse.json(datos, { status: respuesta.status });

  if (tokensNuevos) {
    salida.cookies.set(ACCESS_COOKIE, tokensNuevos.access, cookieOptions);
    salida.cookies.set(REFRESH_COOKIE, tokensNuevos.refresh, cookieOptions);
  }
  return salida;
}

export { manejar as DELETE, manejar as GET, manejar as PATCH, manejar as POST, manejar as PUT };
