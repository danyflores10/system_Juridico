"use client";

import { ChevronRight, Download, FileSearch, FlaskConical, Timer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { EjecucionFuente } from "../types/fuentes.types";
import { EjecucionStatusBadge } from "./fuente-status-badges";

const formatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" });
const typeMeta = {
  PRUEBA_CONEXION: { label: "Prueba", icon: FlaskConical },
  EJECUCION_MANUAL: { label: "Manual", icon: FileSearch },
  EJECUCION_PROGRAMADA: { label: "Programada", icon: Timer },
} as const;

export function FuenteEjecucionesTable({ executions, onOpen }: { executions: EjecucionFuente[]; onOpen: (execution: EjecucionFuente) => void }) {
  return <div className="overflow-hidden rounded-xl border">
    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Resultados</TableHead><TableHead>Mensaje</TableHead><TableHead>Duración</TableHead><TableHead className="text-right">Detalle</TableHead></TableRow></TableHeader><TableBody>{executions.map((execution) => {
      const meta = typeMeta[execution.tipo_ejecucion];
      const Icon = meta.icon;
      const isSearch = execution.tipo_ejecucion !== "PRUEBA_CONEXION";
      let duration = "—";
      if (execution.estado === "EN_PROCESO") duration = "En curso";
      else if (execution.duracion_ms != null) duration = `${(execution.duracion_ms / 1000).toFixed(1)} s`;
      return <TableRow key={execution.id} className={isSearch ? "cursor-pointer" : undefined} onClick={() => isSearch && onOpen(execution)}><TableCell><p className="font-medium">{formatter.format(new Date(execution.inicio))}</p><p className="text-muted-foreground text-xs">{execution.seccion_nombre ?? "Toda la fuente"}</p></TableCell><TableCell><Badge variant="outline"><Icon /> {meta.label}</Badge></TableCell><TableCell><EjecucionStatusBadge estado={execution.estado} /></TableCell><TableCell>{isSearch ? <div className="flex flex-wrap gap-1"><Badge variant="secondary"><Download /> {execution.documentos_descargados} nuevos</Badge><Badge variant="outline">{execution.documentos_duplicados} repetidos</Badge>{execution.total_errores ? <Badge variant="destructive">{execution.total_errores} errores</Badge> : null}</div> : <span className="font-mono text-sm">HTTP {execution.codigo_http ?? "—"}</span>}</TableCell><TableCell className="max-w-sm"><p className="truncate text-sm">{execution.mensaje || "—"}</p></TableCell><TableCell>{duration}</TableCell><TableCell className="text-right">{isSearch ? <Button variant="ghost" size="icon-sm" onClick={(event) => { event.stopPropagation(); onOpen(execution); }}><ChevronRight /></Button> : null}</TableCell></TableRow>;
    })}</TableBody></Table></div>
    {executions.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center"><FileSearch className="size-8 text-muted-foreground" /><p className="font-medium">Sin ejecuciones todavía</p><p className="text-muted-foreground text-sm">Las búsquedas manuales y programadas aparecerán aquí.</p></div> : null}
  </div>;
}
