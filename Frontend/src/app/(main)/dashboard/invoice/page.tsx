import { Save, Send } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Invoice } from "./_components/invoice";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-medium text-3xl leading-none tracking-tight">Crear nueva factura</h1>
          <p className="text-muted-foreground text-sm">
            Completa los datos, revisa la vista previa y envía la factura al cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline">
            <Save data-icon="inline-start" />
            Guardar borrador
          </Button>
          <Button type="button">
            <Send data-icon="inline-start" />
            Enviar factura
          </Button>
        </div>
      </div>

      <Invoice />
    </div>
  );
}
