import { Inbox } from "lucide-react";

export function CatalogoEmptyState() {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <Inbox className="size-8" />
      <p className="font-medium text-foreground">No se encontraron registros</p>
      <p className="text-sm">Pruebe otra búsqueda o cree un nuevo registro.</p>
    </div>
  );
}
