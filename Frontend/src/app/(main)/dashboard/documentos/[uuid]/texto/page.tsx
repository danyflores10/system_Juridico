import { TextoExtraidoClient } from "@/features/documentos/components/texto-extraido-client";

export default async function TextoExtraidoPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <TextoExtraidoClient uuid={uuid} />;
}
