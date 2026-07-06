import { FuenteEjecucionDetailClient } from "@/features/fuentes/components/fuente-ejecucion-detail-client";

export default async function EjecucionFuentePage({ params }: { params: Promise<{ id: string; ejecucionId: string }> }) {
  const { id, ejecucionId } = await params;
  return <FuenteEjecucionDetailClient fuenteId={Number(id)} ejecucionId={Number(ejecucionId)} />;
}
