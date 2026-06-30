import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SidebarSupportCard() {
  return (
    <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
      <CardHeader className="min-w-0 px-4">
        <CardTitle className="truncate text-sm">Consultoría jurídica</CardTitle>
        <CardDescription className="line-clamp-2">
          Panel preparado para expedientes, clientes, audiencias y documentos.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
