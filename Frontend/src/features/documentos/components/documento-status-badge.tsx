import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleOff,
  CopyCheck,
  LoaderCircle,
  ScanSearch,
  SearchCheck,
  ShieldCheck,
  Timer,
  FileOutput,
  FileWarning,
  ClipboardCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { DocumentoEstado } from "../types/documentos.types";

const stateMeta: Record<DocumentoEstado, { label: string; icon: typeof Circle; className: string }> = {
  BORRADOR: { label: "Borrador", icon: Circle, className: "border-muted-foreground/20 bg-muted text-muted-foreground" },
  PENDIENTE_PROCESAMIENTO: {
    label: "Pendiente de iniciar",
    icon: Timer,
    className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  PROCESANDO: {
    label: "Procesando automáticamente",
    icon: LoaderCircle,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  PENDIENTE_EXTRACCION: {
    label: "Procesando automáticamente",
    icon: CheckCircle2,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  CONTROL_CALIDAD: {
    label: "Procesando automáticamente",
    icon: ScanSearch,
    className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  PENDIENTE_APROBACION: {
    label: "Necesita revisión",
    icon: ClipboardCheck,
    className: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  LISTO_PARA_CONVERSION: {
    label: "Preparando archivo final",
    icon: ShieldCheck,
    className: "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  PENDIENTE_REVISION_RAPIDA: {
    label: "Necesita revisión",
    icon: AlertTriangle,
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  OBSERVADO: {
    label: "Necesita revisión",
    icon: AlertOctagon,
    className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
  },
  DUPLICADO_CONFIRMADO: {
    label: "Documento repetido",
    icon: CopyCheck,
    className: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  CONVIRTIENDO: {
    label: "Preparando archivo final",
    icon: LoaderCircle,
    className: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  },
  ERROR_CONVERSION: {
    label: "Necesita atención",
    icon: FileWarning,
    className: "border-destructive/20 bg-destructive/10 text-destructive",
  },
  FINALIZADO: {
    label: "Finalizado",
    icon: FileOutput,
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  PENDIENTE_REVISION: {
    label: "Necesita revisión",
    icon: SearchCheck,
    className: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  VALIDADO: {
    label: "Validado",
    icon: CheckCircle2,
    className: "border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300",
  },
  ERROR: { label: "Necesita atención", icon: AlertTriangle, className: "border-destructive/20 bg-destructive/10 text-destructive" },
  DESCARTADO: {
    label: "Descartado",
    icon: CircleOff,
    className: "border-muted-foreground/20 bg-muted text-muted-foreground",
  },
};

export const documentoEstadoOptions = Object.entries(stateMeta).map(([value, meta]) => ({
  value: value as DocumentoEstado,
  label: meta.label,
}));

export function DocumentoStatusBadge({ estado }: { estado: DocumentoEstado }) {
  const meta = stateMeta[estado];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-sm border font-medium", meta.className)}>
      <Icon className={cn("size-4", (estado === "PROCESANDO" || estado === "CONVIRTIENDO") && "animate-spin")} />
      {meta.label}
    </Badge>
  );
}
