import { RevisionJuridicaClient } from "@/features/revision/components/revision-juridica-client";

export default async function RevisionJuridicaDetallePage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <RevisionJuridicaClient uuid={uuid} />;
}
