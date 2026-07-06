import { AlertTriangle, CheckCircle2, CircleDashed, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { EstadoEjecucion, EstadoPrueba } from "../types/fuentes.types";

export function FuenteStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "outline" : "secondary"}>
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
      {active ? "Activa" : "Inactiva"}
    </Badge>
  );
}

export function ConexionStatusBadge({ estado }: { estado: EstadoPrueba }) {
  if (estado === "DISPONIBLE") {
    return (
      <Badge
        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        variant="outline"
      >
        <CheckCircle2 /> Disponible
      </Badge>
    );
  }
  if (estado === "ERROR") {
    return (
      <Badge className="border-destructive/30 bg-destructive/10 text-destructive" variant="outline">
        <AlertTriangle /> Error
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <CircleDashed /> Sin probar
    </Badge>
  );
}

export function EjecucionStatusBadge({ estado }: { estado: EstadoEjecucion }) {
  if (estado === "EXITOSA") return <Badge className="bg-emerald-600">Exitosa</Badge>;
  if (estado === "ERROR") return <Badge variant="destructive">Error</Badge>;
  if (estado === "EN_PROCESO")
    return (
      <Badge variant="secondary">
        <LoaderCircle className="animate-spin" /> En proceso
      </Badge>
    );
  return <Badge variant="outline">Parcial</Badge>;
}
