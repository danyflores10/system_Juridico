import type { Metadata } from "next";

import { EstadoPago } from "./estado-pago";

export const metadata: Metadata = {
  title: "Estado de tu pago — Consultor Jurídico",
  description: "Verificación del pago de tu suscripción a Consultor Jurídico.",
  robots: { index: false, follow: false },
};

/**
 * Página de retorno de la pasarela de pagos (url_retorno de Libélula).
 * Verifica el estado real del pago contra el backend, que a su vez lo
 * re-verifica server-to-server con Libélula.
 */
export default async function PaginaEstadoPago({ params }: { params: Promise<{ identificador: string }> }) {
  const { identificador } = await params;
  return <EstadoPago identificador={identificador} />;
}
