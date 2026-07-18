import { ResultadoDetalleClient } from "@/features/modificador/components/resultado-detalle-client";

export default async function ResultadoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResultadoDetalleClient id={Number(id)} />;
}
