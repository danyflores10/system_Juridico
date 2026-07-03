import { ConversionFinalCard } from "@/features/documentos/components/conversion-final-card";

export default async function ArchivoFinalPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ConversionFinalCard uuid={uuid} standalone />;
}
