import { ControlCalidadClient } from "@/features/documentos/components/control-calidad-client";

export default async function ControlCalidadPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params;
  return <ControlCalidadClient uuid={uuid} />;
}
