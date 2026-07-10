import { NextResponse } from "next/server";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/server/auth/session";

export async function POST() {
  const salida = NextResponse.json({ ok: true });
  salida.cookies.delete(ACCESS_COOKIE);
  salida.cookies.delete(REFRESH_COOKIE);
  return salida;
}
