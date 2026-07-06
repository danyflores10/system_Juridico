import { Badge } from "@/components/ui/badge";

export function CatalogoStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "outline" : "secondary"}>
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}
