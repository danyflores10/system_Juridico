"use client";

import { useRouter } from "next/navigation";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Binary,
  CheckCircle2,
  CopyCheck,
  Fingerprint,
  Gauge,
  Link2,
  LoaderCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api/client";
import { useDocumento, useResultadoCalidad } from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import type { AlertaCalidad, CalidadResultado, CoincidenciaCalidad, ResultadoCalidad } from "../types/documentos.types";

const outcomeMeta: Record<CalidadResultado, { title: string; description: string; icon: typeof ShieldCheck; className: string; accent: string }> = {
  SIN_ALERTAS_GRAVES: { title: "Documento habilitado", description: "Superó identidad, consistencia y calidad. Puede avanzar a conversión.", icon: ShieldCheck, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100", accent: "#10b981" },
  ALERTA_LEVE: { title: "Revisión rápida necesaria", description: "No hay bloqueos graves, pero algunos datos necesitan confirmación.", icon: AlertTriangle, className: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100", accent: "#f59e0b" },
  ALERTA_GRAVE: { title: "Documento observado", description: "Existen riesgos que deben resolverse antes de continuar.", icon: AlertOctagon, className: "border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100", accent: "#ef4444" },
  DUPLICADO_CONFIRMADO: { title: "Duplicado confirmado", description: "El documento ya existe y fue vinculado con su registro canónico.", icon: CopyCheck, className: "border-orange-500/30 bg-orange-500/10 text-orange-950 dark:text-orange-100", accent: "#f97316" },
};

const severityMeta = {
  GRAVE: { icon: AlertOctagon, label: "Grave", className: "border-red-500/30 bg-red-500/5", badge: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300", iconClass: "bg-red-500/10 text-red-600" },
  LEVE: { icon: AlertTriangle, label: "Leve", className: "border-amber-500/30 bg-amber-500/5", badge: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300", iconClass: "bg-amber-500/10 text-amber-600" },
  INFORMATIVA: { icon: CheckCircle2, label: "Informativa", className: "border-sky-500/30 bg-sky-500/5", badge: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300", iconClass: "bg-sky-500/10 text-sky-600" },
} as const;

export function ControlCalidadClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const document = useDocumento(uuid);
  const quality = useResultadoCalidad(uuid);
  const retry = useDocumentoMutations().retryQuality;

  async function retryQuality() {
    try { await retry.mutateAsync(uuid); toast.success("Control de calidad reenviado."); }
    catch (error) { toast.error("No se pudo reintentar.", { description: getApiErrorMessage(error) }); }
  }

  if (quality.isLoading || document.isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-96" /><Skeleton className="h-52 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (quality.isError || !quality.data) return <Card><CardHeader><CardTitle>No se pudo cargar el control de calidad</CardTitle><CardDescription>{getApiErrorMessage(quality.error)}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /> Volver al documento</Button></CardContent></Card>;
  const data = quality.data;
  if (data.estado === "EN_COLA" || data.estado === "ANALIZANDO") return <AnalyzingState title={data.estado_display} />;
  if (data.estado === "ERROR") return <Card><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><AlertOctagon className="size-11 text-destructive" /><div><h1 className="font-semibold text-xl">{data.error_codigo.trim() ? data.error_codigo : "Error de control"}</h1><p className="mt-1 text-muted-foreground">{data.error_mensaje}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /> Volver</Button><Button onClick={() => void retryQuality()} disabled={retry.isPending}><RefreshCw /> Reintentar</Button></div></CardContent></Card>;

  const outcome = outcomeMeta[data.resultado as CalidadResultado];
  const OutcomeIcon = outcome.icon;
  const score = Number(data.puntuacion_calidad ?? 0);
  return <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="flex items-start gap-3"><Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /></Button><div><div className="flex flex-wrap items-center gap-2"><Gauge className="size-6" /><h1 className="text-3xl tracking-tight">Control de calidad</h1><Badge variant="outline">{data.estado_display}</Badge></div><p className="mt-1 text-muted-foreground">{document.data?.codigo_interno} · {document.data?.nombre_archivo}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}/propuesta`)}><Scale /> Propuesta jurídica</Button>{data.documento_coincidente ? <Button onClick={() => router.push(`/dashboard/documentos/${data.documento_coincidente?.uuid}`)}><Link2 /> Abrir canónico</Button> : null}</div></div>

    <section className={cn("grid overflow-hidden rounded-2xl border lg:grid-cols-[15rem_minmax(0,1fr)]", outcome.className)}>
      <div className="grid min-h-52 place-items-center border-current/10 border-b p-6 lg:border-r lg:border-b-0"><ScoreDial score={score} color={outcome.accent} /></div>
      <div className="flex flex-col justify-center p-7"><div className="flex items-center gap-3"><span className="rounded-xl bg-background/70 p-3"><OutcomeIcon className="size-7" /></span><div><p className="text-xs uppercase tracking-[0.2em] opacity-70">Decisión del control</p><h2 className="font-semibold text-2xl">{outcome.title}</h2></div></div><p className="mt-4 max-w-2xl leading-7 opacity-80">{outcome.description}</p><div className="mt-5 flex flex-wrap gap-2"><RiskPill color="red" value={data.alertas_graves} label="graves" /><RiskPill color="amber" value={data.alertas_leves} label="leves" /><RiskPill color="slate" value={data.coincidencias.length} label="coincidencias" /></div></div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Fingerprint} label="Huella de contenido" value={shortHash(data.hash_contenido)} mono /><Metric icon={Binary} label="Caracteres analizados" value={new Intl.NumberFormat("es-BO").format(data.metricas.caracteres_texto ?? 0)} /><Metric icon={Scale} label="Confianza jurídica" value={`${Number(data.metricas.confianza_extraccion ?? 0).toFixed(2)} %`} /><Metric icon={Gauge} label="Confianza OCR" value={data.metricas.confianza_ocr == null ? "No aplica" : `${Number(data.metricas.confianza_ocr).toFixed(2)} %`} /></div>

    <Tabs defaultValue="alertas" className="gap-4"><TabsList className="h-auto"><TabsTrigger value="alertas">Alertas <Badge variant="secondary">{data.alertas.length}</Badge></TabsTrigger><TabsTrigger value="coincidencias">Coincidencias <Badge variant="secondary">{data.coincidencias.length}</Badge></TabsTrigger><TabsTrigger value="trazabilidad">Trazabilidad</TabsTrigger></TabsList>
      <TabsContent value="alertas"><AlertsPanel alerts={data.alertas} onOpenDocument={(target) => router.push(`/dashboard/documentos/${target}`)} /></TabsContent>
      <TabsContent value="coincidencias"><MatchesPanel matches={data.coincidencias} onOpenDocument={(target) => router.push(`/dashboard/documentos/${target}`)} /></TabsContent>
      <TabsContent value="trazabilidad"><TracePanel data={data} /></TabsContent>
    </Tabs>
  </div>;
}

function AnalyzingState({ title }: { title: string }) {
  const checks = ["Huella SHA-256", "Identidad normativa", "Similitud de contenido", "Calidad OCR", "Evidencias jurídicas"];
  return <Card className="overflow-hidden"><div className="bg-slate-950 px-6 py-5 text-white"><div className="flex items-center gap-3"><ShieldCheck className="size-7 text-cyan-300" /><div><p className="font-semibold text-xl">{title}</p><p className="text-slate-400 text-sm">El motor trabaja en segundo plano.</p></div></div></div><CardContent className="grid min-h-64 gap-6 p-7 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center"><div className="relative mx-auto grid size-32 place-items-center rounded-full border-8 border-cyan-500/10"><LoaderCircle className="size-14 animate-spin text-cyan-600" /></div><div className="space-y-3">{checks.map((check, index) => <div key={check} className="flex items-center gap-3 rounded-lg border p-3"><span className="grid size-7 place-items-center rounded-full bg-muted font-mono text-xs">{index + 1}</span><span className="text-sm">{check}</span></div>)}</div></CardContent></Card>;
}

function AlertsPanel({ alerts, onOpenDocument }: { alerts: AlertaCalidad[]; onOpenDocument: (uuid: string) => void }) {
  if (!alerts.length) return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><span className="rounded-full bg-emerald-500/10 p-4"><ShieldCheck className="size-9 text-emerald-600" /></span><h3 className="font-semibold text-xl">Sin alertas activas</h3><p className="max-w-lg text-muted-foreground">El documento superó todas las reglas configuradas para esta etapa.</p></CardContent></Card>;
  return <div className="grid gap-4">{alerts.map((alert) => <AlertCard key={alert.id} alert={alert} onOpenDocument={onOpenDocument} />)}</div>;
}

function AlertCard({ alert, onOpenDocument }: { alert: AlertaCalidad; onOpenDocument: (uuid: string) => void }) {
  const meta = severityMeta[alert.severidad];
  const Icon = meta.icon;
  const evidence = Object.entries(alert.evidencia);
  const related = alert.documento_relacionado;
  return <Card className={cn("overflow-hidden", meta.className)}><CardContent className="p-0"><div className="grid md:grid-cols-[5rem_minmax(0,1fr)]"><div className={cn("grid min-h-24 place-items-center", meta.iconClass)}><Icon className="size-7" /></div><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={meta.badge}>{meta.label}</Badge><code className="text-muted-foreground text-xs">{alert.codigo}</code></div><h3 className="mt-2 font-semibold text-lg">{alert.titulo}</h3><p className="mt-1 text-muted-foreground text-sm leading-6">{alert.descripcion}</p></div>{related ? <Button variant="outline" size="sm" onClick={() => onOpenDocument(related.uuid)}><Link2 /> {related.codigo_interno}</Button> : null}</div>{evidence.length ? <div className="mt-4 flex flex-wrap gap-2">{evidence.map(([key, value]) => <span key={key} className="rounded-md border bg-background/70 px-2.5 py-1 font-mono text-xs"><span className="text-muted-foreground">{formatKey(key)}:</span> {formatValue(value)}</span>)}</div> : null}</div></div></CardContent></Card>;
}

function MatchesPanel({ matches, onOpenDocument }: { matches: CoincidenciaCalidad[]; onOpenDocument: (uuid: string) => void }) {
  if (!matches.length) return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><Fingerprint className="size-10 text-muted-foreground" /><h3 className="font-semibold text-xl">Sin coincidencias documentales</h3><p className="text-muted-foreground">No encontramos archivos o normas suficientemente parecidas.</p></CardContent></Card>;
  return <div className="grid gap-4 lg:grid-cols-2">{matches.map((match) => <Card key={match.id} className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><div className="flex items-center justify-between gap-3"><div><Badge variant="outline">{match.tipo_display}</Badge><CardTitle className="mt-2 font-mono">{match.documento_coincidente.codigo_interno}</CardTitle></div><Button variant="outline" size="sm" onClick={() => onOpenDocument(match.documento_coincidente.uuid)}><Link2 /> Comparar</Button></div></CardHeader><CardContent className="space-y-5 p-5"><Similarity label="Título" value={Number(match.similitud_titulo)} /><Similarity label="Contenido" value={Number(match.similitud_contenido)} /><div className="flex flex-wrap gap-2"><Badge variant={match.mismo_identificador ? "default" : "secondary"}>{match.mismo_identificador ? "Mismo identificador" : "Identificador diferente"}</Badge><Badge variant={match.misma_fecha ? "default" : "secondary"}>{match.misma_fecha ? "Misma fecha" : "Fecha diferente"}</Badge></div></CardContent></Card>)}</div>;
}

function TracePanel({ data }: { data: ResultadoCalidad }) {
  const rows = [["Intentos", data.intentos], ["Tarea Celery", data.tarea_id || "No registrada"], ["Inicio", formatDate(data.iniciado_at)], ["Finalización", formatDate(data.finalizado_at)], ["Duración", data.duracion_ms == null ? "-" : `${(data.duracion_ms / 1000).toFixed(2)} s`], ["Hash normalizado", data.hash_contenido]];
  return <Card><CardHeader><CardTitle>Trazabilidad de la evaluación</CardTitle><CardDescription>Datos técnicos para auditoría del proceso.</CardDescription></CardHeader><CardContent><dl className="divide-y rounded-xl border">{rows.map(([label, value]) => <div key={String(label)} className="grid gap-1 p-4 sm:grid-cols-[12rem_minmax(0,1fr)]"><dt className="text-muted-foreground text-sm">{label}</dt><dd className={cn("break-all text-sm", String(label).includes("Hash") || label === "Tarea Celery" ? "font-mono" : "font-medium")}>{value}</dd></div>)}</dl></CardContent></Card>;
}

function ScoreDial({ score, color }: { score: number; color: string }) {
  return <div className="grid size-40 place-items-center rounded-full p-3" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgb(255 255 255 / 0.35) 0deg)` }}><div className="grid size-full place-items-center rounded-full bg-background text-foreground shadow-xl"><div className="text-center"><p className="font-bold text-4xl tabular-nums">{score.toFixed(0)}</p><p className="text-[10px] text-muted-foreground uppercase tracking-widest">de 100</p></div></div></div>;
}

function RiskPill({ color, value, label }: { color: "red" | "amber" | "slate"; value: number; label: string }) {
  const classes = { red: "border-red-500/30 bg-red-500/10", amber: "border-amber-500/30 bg-amber-500/10", slate: "border-slate-500/30 bg-slate-500/10" };
  return <span className={cn("rounded-full border px-3 py-1 text-sm", classes[color])}><strong>{value}</strong> {label}</span>;
}

function Metric({ icon: Icon, label, value, mono = false }: { icon: typeof Gauge; label: string; value: string; mono?: boolean }) {
  return <Card><CardContent className="flex items-center gap-4 p-4"><span className="rounded-xl bg-muted p-3"><Icon className="size-5" /></span><div className="min-w-0"><p className="text-muted-foreground text-xs uppercase">{label}</p><p className={cn("mt-1 truncate font-semibold", mono && "font-mono text-sm")}>{value}</p></div></CardContent></Card>;
}

function Similarity({ label, value }: { label: string; value: number }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><strong>{value.toFixed(2)} %</strong></div><Progress value={value} className="h-2" /></div>;
}

function shortHash(hash: string) { return hash ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : "No disponible"; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "-"; }
function formatKey(value: string) { return value.replaceAll("_", " "); }
function formatValue(value: unknown) { return typeof value === "number" ? value.toFixed(2) : String(value); }
