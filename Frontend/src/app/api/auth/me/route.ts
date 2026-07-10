import { NextResponse } from "next/server";

import { obtenerSesion } from "@/server/auth/session";

export async function GET() {
  const usuario = await obtenerSesion();
  if (!usuario) {
    return NextResponse.json({ detail: "No autenticado." }, { status: 401 });
  }
  return NextResponse.json(usuario);
}
