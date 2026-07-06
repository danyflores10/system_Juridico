import { FuenteDetailClient } from "@/features/fuentes/components/fuente-detail-client";

export default async function FuentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FuenteDetailClient id={Number(id)} />;
}
