import { cookies } from "next/headers";

export const ACCESS_COOKIE = "cj_access";
export const REFRESH_COOKIE = "cj_refresh";

export interface SesionUsuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: "admin" | "usuario";
}

export interface TokensSesion {
  access: string;
  refresh: string;
}

export function getDjangoBaseUrl() {
  const base = process.env.DJANGO_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  return base.replace(/\/$/, "");
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/** Renueva el par de tokens contra Django. Devuelve null si el refresh no es válido. */
export async function renovarTokens(refresh: string): Promise<TokensSesion | null> {
  try {
    const respuesta = await fetch(`${getDjangoBaseUrl()}/auth/refresh/`, {
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

async function consultarMe(access: string): Promise<SesionUsuario | null> {
  try {
    const respuesta = await fetch(`${getDjangoBaseUrl()}/auth/me/`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    return (await respuesta.json()) as SesionUsuario;
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario autenticado desde las cookies (para server components).
 * Si el access expiró intenta renovarlo con el refresh (sin persistir cookies,
 * eso lo hace el middleware o las rutas BFF).
 */
export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const almacen = await cookies();
  const access = almacen.get(ACCESS_COOKIE)?.value;
  const refresh = almacen.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return null;

  if (access) {
    const usuario = await consultarMe(access);
    if (usuario) return usuario;
  }
  if (refresh) {
    const tokens = await renovarTokens(refresh);
    if (tokens) return consultarMe(tokens.access);
  }
  return null;
}

export interface PerfilCompleto extends SesionUsuario {
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
  telefono: string;
  matricula: string;
  especialidad: string;
  bio: string;
}

async function consultarPerfil(access: string): Promise<PerfilCompleto | null> {
  try {
    const respuesta = await fetch(`${getDjangoBaseUrl()}/auth/perfil/`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    if (!respuesta.ok) return null;
    return (await respuesta.json()) as PerfilCompleto;
  } catch {
    return null;
  }
}

/** Perfil completo del usuario autenticado (para la página "Mi cuenta"). */
export async function obtenerPerfilCompleto(): Promise<PerfilCompleto | null> {
  const almacen = await cookies();
  const access = almacen.get(ACCESS_COOKIE)?.value;
  const refresh = almacen.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) return null;

  if (access) {
    const perfil = await consultarPerfil(access);
    if (perfil) return perfil;
  }
  if (refresh) {
    const tokens = await renovarTokens(refresh);
    if (tokens) return consultarPerfil(tokens.access);
  }
  return null;
}
