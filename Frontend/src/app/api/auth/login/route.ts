import { NextResponse } from "next/server";

import { ACCESS_COOKIE, cookieOptions, getDjangoBaseUrl, REFRESH_COOKIE } from "@/server/auth/session";

const TREINTA_DIAS_SEGUNDOS = 30 * 24 * 60 * 60;
const CINCO_ANIOS_SEGUNDOS = 5 * 365 * 24 * 60 * 60;

/** Cookie httpOnly que identifica este navegador como "dispositivo". */
const DEVICE_COOKIE = "cj_device";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function leerDeviceId(request: Request): string | null {
  const cookies = request.headers.get("cookie") ?? "";
  const coincidencia = cookies.match(/(?:^|;\s*)cj_device=([^;]+)/);
  const valor = coincidencia?.[1] ?? "";
  return UUID_REGEX.test(valor) ? valor : null;
}

export async function POST(request: Request) {
  let cuerpo: { email?: string; password?: string; remember?: boolean };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ detail: "Solicitud inválida." }, { status: 400 });
  }

  // Identificador del dispositivo: se genera una sola vez por navegador y
  // se conserva en una cookie httpOnly de larga vida. Las cuentas de
  // suscripción quedan vinculadas al primer dispositivo que inicia sesión.
  const deviceId = leerDeviceId(request) ?? crypto.randomUUID();

  const respuesta = await fetch(`${getDjangoBaseUrl()}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: cuerpo.email,
      password: cuerpo.password,
      device_id: deviceId,
    }),
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
  // La identidad del dispositivo persiste siempre (independiente de "Recordarme").
  salida.cookies.set(DEVICE_COOKIE, deviceId, { ...cookieOptions, maxAge: CINCO_ANIOS_SEGUNDOS });
  return salida;
}
