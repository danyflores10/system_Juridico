import { redirect } from "next/navigation";

import { SuscriptoresPageClient } from "@/features/suscriptores/components/suscriptores-page-client";
import { obtenerSesion } from "@/server/auth/session";

export default async function Page() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/auth/v2/login");
  if (sesion.rol !== "admin") redirect("/unauthorized");

  return <SuscriptoresPageClient />;
}
