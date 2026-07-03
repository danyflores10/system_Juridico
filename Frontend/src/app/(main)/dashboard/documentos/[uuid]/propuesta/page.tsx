import { PropuestaJuridicaClient } from "@/features/documentos/components/propuesta-juridica-client";

export default async function PropuestaJuridicaPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <PropuestaJuridicaClient uuid={uuid} />;
}
