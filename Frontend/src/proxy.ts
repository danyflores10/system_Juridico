import { type NextRequest, NextResponse } from "next/server";

/**
 * Guardián de sesión: protege /dashboard, renueva tokens vencidos y
 * restringe los módulos de administración según el rol del JWT.
 * La autorización real siempre se valida además en Django.
 */

const ACCESS_COOKIE = "cj_access";
const REFRESH_COOKIE = "cj_refresh";

const OPCIONES_COOKIE = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

const RUTAS_SOLO_ADMIN = [/^\/dashboard\/users/, /^\/dashboard\/roles/];

interface CargaJwt {
  exp?: number;
  rol?: string;
}

function decodificarJwt(token: string): CargaJwt | null {
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    return JSON.parse(atob(parte.replace(/-/g, "+").replace(/_/g, "/"))) as CargaJwt;
  } catch {
    return null;
  }
}

function baseDjango() {
  const base = process.env.DJANGO_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  return base.replace(/\/$/, "");
}

async function renovarTokens(refresh: string) {
  try {
    const respuesta = await fetch(`${baseDjango()}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    const datos = (await respuesta.json()) as { access?: string; refresh?: string };
    if (!datos.access) return null;
    return { access: datos.access, refresh: datos.refresh ?? refresh };
  } catch {
    return null;
  }
}

function redirigirALogin(request: NextRequest) {
  const destino = new URL("/auth/v2/login", request.url);
  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.delete(ACCESS_COOKIE);
  respuesta.cookies.delete(REFRESH_COOKIE);
  return respuesta;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  const carga = access ? decodificarJwt(access) : null;
  const ahora = Math.floor(Date.now() / 1000);
  const accessValido = Boolean(carga?.exp && carga.exp > ahora + 15);

  // Usuarios ya autenticados no necesitan ver login/registro.
  if (/^\/auth\/v[12]\/(login|register)/.test(pathname)) {
    if (accessValido) {
      return NextResponse.redirect(new URL("/dashboard/default", request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  let rol = carga?.rol;
  let tokensNuevos: { access: string; refresh: string } | null = null;

  if (!accessValido) {
    if (!refresh) return redirigirALogin(request);
    tokensNuevos = await renovarTokens(refresh);
    if (!tokensNuevos) return redirigirALogin(request);
    rol = decodificarJwt(tokensNuevos.access)?.rol;
  }

  const respuesta =
    RUTAS_SOLO_ADMIN.some((ruta) => ruta.test(pathname)) && rol !== "admin"
      ? NextResponse.redirect(new URL("/unauthorized", request.url))
      : NextResponse.next();

  if (tokensNuevos) {
    respuesta.cookies.set(ACCESS_COOKIE, tokensNuevos.access, OPCIONES_COOKIE);
    respuesta.cookies.set(REFRESH_COOKIE, tokensNuevos.refresh, OPCIONES_COOKIE);
  }
  return respuesta;
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*"],
};
