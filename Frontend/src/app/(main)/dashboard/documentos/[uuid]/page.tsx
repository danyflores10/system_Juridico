import { DocumentoDetailClient } from "@/features/documentos/components/documento-detail-client";

export default async function DocumentoPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  return <DocumentoDetailClient uuid={uuid} />;
}
