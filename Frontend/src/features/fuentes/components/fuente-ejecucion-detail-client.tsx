"use client";

import * as React from "react";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CopyCheck,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  Gauge,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useEjecucion, useHallazgos } from "../hooks/use-fuentes";
import type { EjecucionFuente, EstadoHallazgo, HallazgoFuente } from "../types/fuentes.types";
import { EjecucionStatusBadge } from "./fuente-status-badges";

const dateTime = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "medium" });
const typeLabels = {
  PRUEBA_CONEXION: "Prueba de conexión",
  EJECUCION_MANUAL: "Búsqueda manual",
  EJECUCION_PROGRAMADA: "Revisión programada",
} as const;

export function FuenteEjecucionDetailClient({ fuenteId, ejecucionId }: { fuenteId: number; ejecucionId: number }) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const execution = useEjecucion(ejecucionId);
  const findings = useHallazgos(ejecucionId, page, execution.data?.estado === "EN_PROCESO");

  if (execution.isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-60 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (execution.isError || !execution.data) return <Card><CardHeader><CardTitle>No se pudo cargar la ejecución</CardTitle><CardDescription>{getApiErrorMessage(execution.error)}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => router.push(`/dashboard/fuentes/${fuenteId}`)}><ArrowLeft /> Volver</Button></CardContent></Card>;

  const item = execution.data;
  const totalPages = Math.max(1, Math.ceil((findings.data?.count ?? 0) / 20));
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="flex items-start gap-3"><Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/fuentes/${fuenteId}`)}><ArrowLeft /></Button><div><div className="flex flex-wrap items-center gap-2"><Search className="size-6" /><h1 className="text-3xl tracking-tight">Ejecución #{item.id}</h1><EjecucionStatusBadge estado={item.estado} /></div><p className="mt-1 text-muted-foreground">{item.fuente_nombre} · {typeLabels[item.tipo_ejecucion]}</p></div></div>
      <Button variant="outline" onClick={() => void Promise.all([execution.refetch(), findings.refetch()])}><RefreshCw /> Actualizar</Button>
    </div>

    {item.estado === "EN_PROCESO" ? <RunningBanner /> : <OutcomeBanner execution={item} />}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric icon={FileSearch} label="Encontrados" value={item.documentos_encontrados} tone="slate" />
      <Metric icon={Download} label="Nuevos" value={item.documentos_descargados} tone="emerald" />
      <Metric icon={CopyCheck} label="Duplicados" value={item.documentos_duplicados} tone="amber" />
      <Metric icon={AlertTriangle} label="Errores" value={item.total_errores} tone="red" />
      <Metric icon={Gauge} label="Páginas revisadas" value={item.paginas_revisadas} tone="indigo" />
    </div>

    <Card className="overflow-hidden">
      <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>PDF encontrados</CardTitle><CardDescription>Cada enlace conserva su resultado, documento relacionado y evidencia técnica.</CardDescription></div><Badge variant="secondary">{findings.data?.count ?? 0} resultados</Badge></div></CardHeader>
      <CardContent className="p-0">
        {findings.isLoading ? <div className="space-y-3 p-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div> : null}
        {!findings.isLoading && findings.data?.results.length ? <FindingsTable items={findings.data.results} onOpenDocument={(uuid) => router.push(`/dashboard/documentos/${uuid}`)} /> : null}
        {!findings.isLoading && !findings.data?.results.length ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><span className="rounded-2xl bg-muted p-4"><FileSearch className="size-8 text-muted-foreground" /></span><h3 className="font-semibold text-lg">{item.estado === "EN_PROCESO" ? "Buscando documentos" : "No se encontraron PDF"}</h3><p className="max-w-lg text-muted-foreground text-sm">{item.estado === "EN_PROCESO" ? "Los hallazgos aparecerán aquí automáticamente." : "Revise la URL de consulta o configure un patrón para esta fuente."}</p></div> : null}
      </CardContent>
      {totalPages > 1 ? <div className="flex items-center justify-between border-t px-5 py-3"><p className="text-muted-foreground text-sm">Página {page} de {totalPages}</p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Siguiente</Button></div></div> : null}
    </Card>

    <Card><CardHeader><CardTitle>Trazabilidad</CardTitle><CardDescription>Información operativa para auditoría.</CardDescription></CardHeader><CardContent><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><Fact label="Inicio" value={dateTime.format(new Date(item.inicio))} /><Fact label="Finalización" value={item.fin ? dateTime.format(new Date(item.fin)) : "En curso"} /><Fact label="Duración" value={item.duracion_ms == null ? "—" : `${(item.duracion_ms / 1000).toFixed(2)} s`} /><Fact label="Tarea Celery" value={item.tarea_id || "No registrada"} mono /></dl>{item.detalle_error ? <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><p className="font-medium text-destructive">Detalle técnico</p><pre className="mt-2 whitespace-pre-wrap text-sm">{item.detalle_error}</pre></div> : null}</CardContent></Card>
  </div>;
}

function RunningBanner() {
  return <section className="grid overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white lg:grid-cols-[13rem_minmax(0,1fr)]"><div className="grid min-h-48 place-items-center border-white/10 border-b lg:border-r lg:border-b-0"><div className="relative grid size-28 place-items-center rounded-full border-8 border-white/10"><LoaderCircle className="size-12 animate-spin text-indigo-300" /></div></div><div className="flex flex-col justify-center p-7"><p className="text-indigo-300 text-xs uppercase tracking-[0.2em]">Motor trabajando</p><h2 className="mt-2 font-semibold text-2xl">Buscando normativa nueva</h2><p className="mt-2 max-w-2xl text-slate-300">Se están revisando enlaces, validando archivos PDF y comparando URLs y hashes antes de enviarlos a OCR.</p><Progress value={62} className="mt-6 h-2 bg-white/10" /></div></section>;
}

function OutcomeBanner({ execution }: { execution: EjecucionFuente }) {
  let meta = { panel: "border-destructive/30 bg-destructive/5", icon: "bg-destructive/10 text-destructive", title: "La revisión encontró un problema", success: false };
  if (execution.estado === "EXITOSA") {
    meta = { panel: "border-emerald-500/30 bg-emerald-500/5", icon: "bg-emerald-500/10 text-emerald-600", title: "Revisión completada", success: true };
  } else if (execution.estado === "PARCIAL") {
    meta = { panel: "border-amber-500/30 bg-amber-500/5", icon: "bg-amber-500/10 text-amber-600", title: "Revisión completada con observaciones", success: false };
  }
  return <section className={cn("flex items-start gap-4 rounded-2xl border p-6", meta.panel)}><span className={cn("rounded-2xl p-3", meta.icon)}>{meta.success ? <CheckCircle2 className="size-7" /> : <AlertTriangle className="size-7" />}</span><div><p className="font-semibold text-xl">{meta.title}</p><p className="mt-1 text-muted-foreground">{execution.mensaje}</p></div></section>;
}

function FindingsTable({ items, onOpenDocument }: { items: HallazgoFuente[]; onOpenDocument: (uuid: string) => void }) {
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Resultado</TableHead><TableHead>Documento encontrado</TableHead><TableHead>Sección</TableHead><TableHead>Archivo</TableHead><TableHead>Tamaño</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => {
    const documentUuid = item.documento_uuid;
    return <TableRow key={item.id}><TableCell><FindingBadge estado={item.estado} label={item.estado_display} /></TableCell><TableCell className="max-w-md"><p className="truncate font-medium">{item.titulo_encontrado || item.nombre_archivo || "Documento sin título"}</p><p className="truncate text-muted-foreground text-xs">{item.mensaje || item.detalle_error}</p></TableCell><TableCell>{item.seccion_nombre ?? "Fuente principal"}</TableCell><TableCell><p className="max-w-52 truncate font-mono text-xs">{item.nombre_archivo || "—"}</p>{item.documento_codigo ? <Badge variant="outline" className="mt-1 font-mono">{item.documento_codigo}</Badge> : null}</TableCell><TableCell>{item.tamano_bytes ? formatBytes(item.tamano_bytes) : "—"}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1">{documentUuid ? <Button variant="outline" size="sm" onClick={() => onOpenDocument(documentUuid)}><FileText /> Ver documento</Button> : null}<Button variant="ghost" size="icon-sm" asChild><a href={item.url} target="_blank" rel="noreferrer" title="Abrir enlace de origen"><ExternalLink /></a></Button></div></TableCell></TableRow>;
  })}</TableBody></Table></div>;
}

function FindingBadge({ estado, label }: { estado: EstadoHallazgo; label: string }) {
  const style = { DESCARGADO: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700", DUPLICADO: "border-amber-500/30 bg-amber-500/10 text-amber-700", ERROR: "border-destructive/30 bg-destructive/10 text-destructive", OMITIDO: "", DESCUBIERTO: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700" }[estado];
  return <Badge variant="outline" className={style}>{label}</Badge>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Search; label: string; value: number; tone: "slate" | "emerald" | "amber" | "red" | "indigo" }) {
  const colors = { slate: "bg-slate-500/10 text-slate-600", emerald: "bg-emerald-500/10 text-emerald-600", amber: "bg-amber-500/10 text-amber-600", red: "bg-red-500/10 text-red-600", indigo: "bg-indigo-500/10 text-indigo-600" };
  return <Card><CardContent className="flex items-center gap-4 p-4"><span className={cn("rounded-xl p-3", colors[tone])}><Icon className="size-5" /></span><div><p className="text-muted-foreground text-xs uppercase">{label}</p><p className="mt-1 font-semibold text-2xl tabular-nums">{value}</p></div></CardContent></Card>;
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><dt className="text-muted-foreground text-xs uppercase">{label}</dt><dd className={cn("mt-1 break-all font-medium text-sm", mono && "font-mono text-xs")}>{value}</dd></div>; }
function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
