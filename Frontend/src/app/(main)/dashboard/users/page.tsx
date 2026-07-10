import { redirect } from "next/navigation";

import { UsuariosPageClient } from "@/features/usuarios/components/usuarios-page-client";
import { obtenerSesion } from "@/server/auth/session";

export default async function Page() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/auth/v2/login");
  if (sesion.rol !== "admin") redirect("/unauthorized");

  return <UsuariosPageClient usuarioActualId={sesion.id} />;
}
