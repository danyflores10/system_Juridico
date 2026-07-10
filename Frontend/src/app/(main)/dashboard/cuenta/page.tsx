import { redirect } from "next/navigation";

import { obtenerPerfilCompleto } from "@/server/auth/session";

import { CuentaClient } from "./_components/cuenta-client";

export default async function CuentaPage() {
  const perfil = await obtenerPerfilCompleto();
  if (!perfil) redirect("/auth/v2/login");

  return <CuentaClient perfil={perfil} />;
}
