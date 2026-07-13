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
  Globe2,
  LoaderCircle,
  RefreshCw,
  type Search,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Avance real de la ejecución: enlaces ya resueltos frente a enlaces encontrados. */
function progressStats(item: EjecucionFuente) {
  const total = item.documentos_encontrados;
  const processed = Math.min(
    total,
    item.documentos_descargados + item.documentos_duplicados + item.documentos_omitidos + item.total_errores,
  );
  if (item.estado !== "EN_PROCESO") return { total, processed: total, percent: 100 };
  if (total <= 0) return { total, processed, percent: null };
  return { total, processed, percent: Math.min(99, Math.round((processed / total) * 100)) };
}

function useElapsedSeconds(start: string, end: string | null, running: boolean) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const stop = running || !end ? now : new Date(end).getTime();
  return Math.max(0, Math.floor((stop - new Date(start).getTime()) / 1000));
}

function formatElapsed(totalSeconds: number) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function FuenteEjecucionDetailClient({ fuenteId, ejecucionId }: { fuenteId: number; ejecucionId: number }) {
  const router = useRouter();
  const [page, setPage] = React.useState(1);
  const execution = useEjecucion(ejecucionId);
  const findings = useHallazgos(ejecucionId, page, execution.data?.estado === "EN_PROCESO");

  if (execution.isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-60 w-full rounded-none" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (execution.isError || !execution.data)
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se pudo cargar la ejecución</CardTitle>
          <CardDescription>{getApiErrorMessage(execution.error)}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => router.push(`/dashboard/fuentes/${fuenteId}`)}>
            <ArrowLeft /> Volver
          </Button>
        </CardContent>
      </Card>
    );

  const item = execution.data;
  const running = item.estado === "EN_PROCESO";
  const totalPages = Math.max(1, Math.ceil((findings.data?.count ?? 0) / 20));
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="mt-0.5"
            onClick={() => router.push(`/dashboard/fuentes/${fuenteId}`)}
          >
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Globe2 className="size-5" />
              </span>
              <h1 className="font-semibold text-2xl tracking-tight lg:text-3xl">Ejecución #{item.id}</h1>
              <EjecucionStatusBadge estado={item.estado} />
            </div>
            <p className="mt-1.5 text-muted-foreground text-sm">
              {item.fuente_nombre} · {typeLabels[item.tipo_ejecucion]}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void Promise.all([execution.refetch(), findings.refetch()])}>
          <RefreshCw className={cn(running && "animate-spin [animation-duration:2.5s]")} /> Actualizar
        </Button>
      </div>

      {running ? <RunningBanner execution={item} /> : <OutcomeBanner execution={item} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Metric icon={FileSearch} label="Encontrados" value={item.documentos_encontrados} tone="slate" />
        <Metric icon={Download} label="Nuevos" value={item.documentos_descargados} tone="emerald" />
        <Metric icon={CopyCheck} label="Duplicados" value={item.documentos_duplicados} tone="amber" />
        <Metric icon={AlertTriangle} label="Errores" value={item.total_errores} tone="red" />
        <Metric icon={Gauge} label="Páginas revisadas" value={item.paginas_revisadas} tone="blue" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>PDF encontrados</CardTitle>
              <CardDescription>
                Cada enlace conserva su resultado, documento relacionado y evidencia técnica.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1 font-semibold tabular-nums">
              {findings.data?.count ?? 0} resultados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {findings.isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : null}
          {!findings.isLoading && findings.data?.results.length ? (
            <FindingsTable
              items={findings.data.results}
              running={running}
              onOpenDocument={(uuid) => router.push(`/dashboard/documentos/${uuid}`)}
            />
          ) : null}
          {!findings.isLoading && !findings.data?.results.length ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="rounded-2xl bg-muted p-4">
                {running ? (
                  <LoaderCircle className="size-8 animate-spin text-primary" />
                ) : (
                  <FileSearch className="size-8 text-muted-foreground" />
                )}
              </span>
              <h3 className="font-semibold text-lg">{running ? "Buscando documentos" : "No se encontraron PDF"}</h3>
              <p className="max-w-lg text-muted-foreground text-sm">
                {running
                  ? "Los hallazgos aparecerán aquí automáticamente."
                  : "Revise la URL de consulta o configure un patrón para esta fuente."}
              </p>
            </div>
          ) : null}
        </CardContent>
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t px-5 py-3">
            <p className="text-muted-foreground text-sm">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Trazabilidad</CardTitle>
          <CardDescription>Información operativa para auditoría.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Fact label="Inicio" value={dateTime.format(new Date(item.inicio))} />
            <Fact label="Finalización" value={item.fin ? dateTime.format(new Date(item.fin)) : "En curso"} />
            <Fact
              label="Duración"
              value={item.duracion_ms == null ? "—" : `${(item.duracion_ms / 1000).toFixed(2)} s`}
            />
            <Fact label="Tarea Celery" value={item.tarea_id || "No registrada"} mono />
          </dl>
          {item.detalle_error ? (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Detalle técnico</p>
              <pre className="mt-2 whitespace-pre-wrap text-sm">{item.detalle_error}</pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressRing({
  percent,
  from = "#ffffff",
  to = "#e0e7ff",
  gradientId = "ejecucion-ring",
  labelClassName = "text-primary-foreground/70",
  compact = false,
}: {
  percent: number | null;
  from?: string;
  to?: string;
  gradientId?: string;
  labelClassName?: string;
  compact?: boolean;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const ratio = percent == null ? 0.25 : percent / 100;
  return (
    <div className={cn("relative grid place-items-center", compact ? "size-24" : "size-40")}>
      <svg
        aria-hidden="true"
        viewBox="0 0 128 128"
        className={cn(
          "-rotate-90",
          compact ? "size-24" : "size-40",
          percent == null && "animate-spin [animation-duration:1.8s]",
        )}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-primary-foreground/20"
          strokeWidth={compact ? 11 : 9}
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={compact ? 11 : 9}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {percent == null ? (
          <LoaderCircle className={cn("animate-spin text-primary-foreground/80", compact ? "size-6" : "size-9")} />
        ) : (
          <div className="text-center">
            <p className={cn("font-bold tabular-nums leading-none", compact ? "text-lg" : "text-4xl")}>
              {percent}
              <span className={compact ? "text-xs" : "text-xl"}>%</span>
            </p>
            {!compact && (
              <p className={cn("mt-1.5 text-[10px] uppercase tracking-[0.2em]", labelClassName)}>Completado</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveStat({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", dot)} />
      <span className="font-semibold text-primary-foreground tabular-nums">{value}</span> {label}
    </span>
  );
}

function RunningBanner({ execution }: { execution: EjecucionFuente }) {
  const { total, processed, percent } = progressStats(execution);
  const elapsed = useElapsedSeconds(execution.inicio, execution.fin, true);
  return (
    <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
      <Globe2 className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
      <div className="relative grid gap-6 p-6 md:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-10">
        <div className="mx-auto lg:mx-0">
          <ProgressRing percent={percent} />
        </div>
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
            <LoaderCircle className="size-3.5 animate-spin" /> Motor trabajando
          </span>
          <h2 className="mt-2.5 font-semibold text-2xl tracking-tight md:text-3xl">Buscando normativa nueva</h2>
          <p className="mt-1.5 max-w-2xl text-primary-foreground/80 text-sm">
            Se están revisando enlaces, validando archivos PDF y comparando URLs y hashes antes de enviarlos a OCR.
          </p>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-3">
              <span className="text-primary-foreground/80 text-sm">
                {total > 0 ? (
                  <>
                    <span className="font-semibold text-primary-foreground tabular-nums">{processed}</span> de{" "}
                    <span className="font-semibold text-primary-foreground tabular-nums">{total}</span> enlaces
                    procesados
                  </>
                ) : (
                  "Explorando páginas de la fuente…"
                )}
              </span>
              <span className="font-bold text-lg tabular-nums">{percent == null ? "· · ·" : `${percent}%`}</span>
            </div>
            <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-primary-foreground/15">
              {percent == null ? (
                <span className="progress-indeterminate absolute top-0 h-full w-1/3 rounded-full bg-primary-foreground/80" />
              ) : (
                <div
                  className="relative h-full overflow-hidden rounded-full bg-primary-foreground transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(percent, 3)}%` }}
                >
                  <span className="progress-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-primary-foreground/80 text-xs">
            <LiveStat dot="bg-emerald-300" label="descargados" value={execution.documentos_descargados} />
            <LiveStat dot="bg-amber-300" label="duplicados" value={execution.documentos_duplicados} />
            <LiveStat dot="bg-red-300" label="errores" value={execution.total_errores} />
            <LiveStat dot="bg-sky-300" label="páginas revisadas" value={execution.paginas_revisadas} />
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 font-mono tabular-nums">
              <Timer className="size-3.5" /> {formatElapsed(elapsed)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const outcomeTones = {
  EXITOSA: {
    eyebrow: "Revisión finalizada",
    title: "Revisión completada",
    accent: "text-emerald-300",
    dot: "bg-emerald-400",
    from: "#34d399",
    to: "#10b981",
    success: true,
  },
  PARCIAL: {
    eyebrow: "Finalizada con observaciones",
    title: "Revisión completada con observaciones",
    accent: "text-amber-300",
    dot: "bg-amber-400",
    from: "#fbbf24",
    to: "#f59e0b",
    success: false,
  },
  ERROR: {
    eyebrow: "Revisión interrumpida",
    title: "La revisión encontró un problema",
    accent: "text-red-300",
    dot: "bg-red-400",
    from: "#f87171",
    to: "#ef4444",
    success: false,
  },
} as const;

function OutcomeBanner({ execution }: { execution: EjecucionFuente }) {
  const tone =
    outcomeTones[execution.estado === "EXITOSA" || execution.estado === "PARCIAL" ? execution.estado : "ERROR"];
  const fallbackElapsed = useElapsedSeconds(execution.inicio, execution.fin, false);
  const durationSeconds = execution.duracion_ms == null ? fallbackElapsed : Math.round(execution.duracion_ms / 1000);
  const segments = [
    { value: execution.documentos_descargados, className: "bg-emerald-400", dot: "bg-emerald-400", label: "nuevos" },
    { value: execution.documentos_duplicados, className: "bg-amber-400", dot: "bg-amber-400", label: "duplicados" },
    { value: execution.documentos_omitidos, className: "bg-slate-400", dot: "bg-slate-400", label: "omitidos" },
    { value: execution.total_errores, className: "bg-red-400", dot: "bg-red-400", label: "errores" },
  ].filter((segment) => segment.value > 0);
  const totalSegments = segments.reduce((sum, segment) => sum + segment.value, 0);
  const totalLinks = Math.max(execution.documentos_encontrados, totalSegments);
  return (
    <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
      <Globe2 className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
      <div className="relative">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="mx-auto shrink-0 sm:mx-0">
            <ProgressRing
              compact
              percent={100}
              from={tone.from}
              to={tone.to}
              gradientId={`resultado-${execution.estado}`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
                {tone.success ? (
                  <CheckCircle2 className={cn("size-3.5", tone.accent)} />
                ) : (
                  <AlertTriangle className={cn("size-3.5", tone.accent)} />
                )}
                {tone.eyebrow}
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 font-mono text-xs tabular-nums">
                <Timer className="size-3.5" /> {formatElapsed(durationSeconds)}
              </span>
            </div>
            <h2 className="mt-2 font-semibold text-xl tracking-tight md:text-2xl">{tone.title}</h2>
            <p className="mt-1 text-primary-foreground/80 text-sm">{execution.mensaje}</p>
          </div>
        </div>
        <div className="border-primary-foreground/15 border-t bg-black/10 px-5 py-4 sm:px-6">
          {totalSegments > 0 ? (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="shrink-0 text-primary-foreground/80 text-sm">
                <span className="font-semibold text-primary-foreground tabular-nums">{totalSegments}</span> de{" "}
                <span className="font-semibold text-primary-foreground tabular-nums">{totalLinks}</span> enlaces
                procesados
              </span>
              <div className="flex h-2 min-w-40 flex-1 overflow-hidden rounded-full bg-primary-foreground/15">
                {segments.map((segment) => (
                  <div
                    key={segment.label}
                    className={cn("h-full", segment.className)}
                    style={{ width: `${(segment.value / totalSegments) * 100}%` }}
                    title={`${segment.value} ${segment.label}`}
                  />
                ))}
              </div>
              <span className={cn("shrink-0 font-bold text-sm tabular-nums", tone.accent)}>100%</span>
            </div>
          ) : (
            <p className="text-primary-foreground/80 text-sm">No se procesaron enlaces en esta ejecución.</p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-primary-foreground/80 text-xs">
            {segments.map((segment) => (
              <LiveStat key={segment.label} dot={segment.dot} label={segment.label} value={segment.value} />
            ))}
            <LiveStat dot="bg-sky-300" label="páginas revisadas" value={execution.paginas_revisadas} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FindingsTable({
  items,
  running,
  onOpenDocument,
}: {
  items: HallazgoFuente[];
  running: boolean;
  onOpenDocument: (uuid: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-5">Resultado</TableHead>
            <TableHead>Documento encontrado</TableHead>
            <TableHead>Sección</TableHead>
            <TableHead>Archivo</TableHead>
            <TableHead className="text-right">Tamaño</TableHead>
            <TableHead className="pr-5 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const documentUuid = item.documento_uuid;
            const downloading = running && item.estado === "DESCUBIERTO";
            return (
              <TableRow key={item.id} className="group">
                <TableCell className="pl-5">
                  <FindingBadge estado={item.estado} label={item.estado_display} />
                </TableCell>
                <TableCell className="max-w-md">
                  <p className="truncate font-medium">
                    {item.titulo_encontrado || item.nombre_archivo || "Documento sin título"}
                  </p>
                  {downloading ? (
                    <span className="mt-1.5 flex items-center gap-2">
                      <span className="relative block h-1.5 w-36 overflow-hidden rounded-full bg-muted">
                        <span className="progress-indeterminate absolute top-0 h-full w-1/2 rounded-full bg-gradient-to-r from-primary/60 to-primary" />
                      </span>
                      <span className="font-medium text-[11px] text-primary">Descargando…</span>
                    </span>
                  ) : (
                    <p className="truncate text-muted-foreground text-xs">{item.mensaje || item.detalle_error}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.seccion_nombre ?? "Fuente principal"}</TableCell>
                <TableCell>
                  <p className="max-w-52 truncate font-mono text-xs">{item.nombre_archivo || "—"}</p>
                  {item.documento_codigo ? (
                    <Badge variant="outline" className="mt-1 rounded-full font-mono">
                      {item.documento_codigo}
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.tamano_bytes ? formatBytes(item.tamano_bytes) : "—"}
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex justify-end gap-1">
                    {documentUuid ? (
                      <Button variant="outline" size="sm" onClick={() => onOpenDocument(documentUuid)}>
                        <FileText /> Ver documento
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a href={item.url} target="_blank" rel="noreferrer" title="Abrir enlace de origen">
                        <ExternalLink />
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FindingBadge({ estado, label }: { estado: EstadoHallazgo; label: string }) {
  const style = {
    DESCARGADO: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    DUPLICADO: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    ERROR: "border-destructive/30 bg-destructive/10 text-destructive",
    OMITIDO: "",
    DESCUBIERTO: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  }[estado];
  const dot = {
    DESCARGADO: "bg-emerald-500",
    DUPLICADO: "bg-amber-500",
    ERROR: "bg-destructive",
    OMITIDO: "bg-muted-foreground",
    DESCUBIERTO: "bg-sky-500 animate-pulse",
  }[estado];
  return (
    <Badge variant="outline" className={cn("rounded-full", style)}>
      <span className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </Badge>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Search;
  label: string;
  value: number;
  tone: "slate" | "emerald" | "amber" | "red" | "blue";
}) {
  const styles = {
    slate: { icon: "bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300", bar: "bg-slate-400" },
    emerald: { icon: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20", bar: "bg-emerald-500" },
    amber: { icon: "bg-amber-500/10 text-amber-600 ring-amber-500/20", bar: "bg-amber-500" },
    red: { icon: "bg-red-500/10 text-red-600 ring-red-500/20", bar: "bg-red-500" },
    blue: { icon: "bg-primary/10 text-primary ring-primary/20", bar: "bg-primary" },
  }[tone];
  return (
    <Card className="relative h-full py-0 transition-shadow hover:shadow-md">
      <span className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full", styles.bar)} />
      <CardContent className="flex h-full items-center gap-4 p-5">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1", styles.icon)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="mt-0.5 font-bold text-3xl tabular-nums leading-none">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <dt className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className={cn("mt-1.5 break-all font-medium text-sm", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
