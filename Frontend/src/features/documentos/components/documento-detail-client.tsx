"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  LoaderCircle,
  Play,
  RefreshCw,
  Scale,
  Sparkles,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  FileOutput,
  CheckCircle2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  useDocumento,
  usePropuestaExtraccion,
  useResultadoCalidad,
  useResultadoProcesamiento,
} from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import type { ProcesamientoResumen } from "../types/documentos.types";
import { DocumentoStatusBadge } from "./documento-status-badge";
import { ConversionFinalCard } from "./conversion-final-card";

const dateTime = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short" });
const number = new Intl.NumberFormat("es-BO");
function size(bytes: number) { return `${(bytes / 1024 / 1024).toFixed(2)} MB`; }
function duration(ms: number | null) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function TechnicalResult({ result }: { result: ProcesamientoResumen }) {
  if (result.estado === "EN_COLA" || result.estado === "PROCESANDO") {
    return <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"><LoaderCircle className="size-5 animate-spin text-amber-600" /><div><p className="font-medium">{result.estado_display}</p><p className="text-muted-foreground text-sm">El proceso continúa en segundo plano. Esta vista se actualizará automáticamente.</p></div></div>;
  }
  if (result.estado === "ERROR") {
    return <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"><p className="font-medium text-destructive">{result.error_codigo.trim() ? result.error_codigo : "Error de procesamiento"}</p><p className="mt-1 text-sm">{result.error_mensaje}</p></div>;
  }
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Tipo de PDF</p><p className="mt-1 font-semibold">{result.tipo_pdf_display}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Páginas</p><p className="mt-1 font-semibold">{result.numero_paginas}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">OCR aplicado</p><p className="mt-1 font-semibold">{result.ocr_aplicado ? `Sí · ${result.paginas_con_ocr} pág.` : "No fue necesario"}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Confianza OCR</p><p className="mt-1 font-semibold">{result.confianza_ocr ? `${Number(result.confianza_ocr).toFixed(2)} %` : "No aplica"}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Caracteres</p><p className="mt-1 font-semibold">{number.format(result.caracteres_extraidos)}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Duración</p><p className="mt-1 font-semibold">{duration(result.duracion_ms)}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Páginas con texto</p><p className="mt-1 font-semibold">{result.paginas_con_texto}</p></div>
    <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">Intentos</p><p className="mt-1 font-semibold">{result.intentos}</p></div>
  </div>;
}

export function DocumentoDetailClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const query = useDocumento(uuid);
  const resultQuery = useResultadoProcesamiento(uuid, Boolean(query.data?.procesamiento));
  const proposalQuery = usePropuestaExtraccion(uuid, Boolean(query.data?.extraccion));
  const qualityQuery = useResultadoCalidad(uuid, Boolean(query.data?.calidad));
  const mutations = useDocumentoMutations();
  if (query.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-96 w-full" /></div>;
  if (query.isError || !query.data) return <Card><CardHeader><CardTitle>No se pudo cargar el documento</CardTitle><CardDescription>{getApiErrorMessage(query.error)}</CardDescription></CardHeader></Card>;
  const document = query.data;
  const original = document.archivos.find((item) => item.tipo_archivo === "PDF_ORIGINAL");
  const result = resultQuery.data ?? document.procesamiento;
  const processedUrl = resultQuery.data?.archivo_procesado_url;
  const working = result?.estado === "EN_COLA" || result?.estado === "PROCESANDO";
  const extraction = proposalQuery.data ?? document.extraccion;
  const extracting = extraction?.estado === "EN_COLA" || extraction?.estado === "EXTRAYENDO";
  const quality = qualityQuery.data ?? document.calidad;
  const checkingQuality = quality?.estado === "EN_COLA" || quality?.estado === "ANALIZANDO";

  async function startProcessing() {
    try {
      if (document.estado === "ERROR") await mutations.retry.mutateAsync(uuid);
      else await mutations.process.mutateAsync(uuid);
      toast.success(document.estado === "ERROR" ? "Reintento enviado." : "Procesamiento enviado.", { description: "Celery continuará el trabajo en segundo plano." });
    } catch (error) {
      toast.error("No se pudo iniciar el procesamiento.", { description: getApiErrorMessage(error) });
    }
  }

  async function discardDocument() {
    if (!window.confirm("¿Descartar este documento? El PDF original se conservará.")) return;
    try { await mutations.discard.mutateAsync(uuid); toast.success("Documento descartado."); router.push("/dashboard/documentos"); }
    catch (error) { toast.error("No se pudo descartar.", { description: getApiErrorMessage(error) }); }
  }

  async function startExtraction() {
    try {
      if (extraction?.estado === "ERROR") await mutations.retryExtraction.mutateAsync(uuid);
      else await mutations.extract.mutateAsync(uuid);
      toast.success(extraction?.estado === "ERROR" ? "Reintento de extracción enviado." : "Extracción jurídica enviada.", { description: "La propuesta se actualizará automáticamente." });
    } catch (error) {
      toast.error("No se pudo iniciar la extracción.", { description: getApiErrorMessage(error) });
    }
  }

  async function startQuality() {
    try {
      if (quality?.estado === "ERROR") await mutations.retryQuality.mutateAsync(uuid);
      else await mutations.quality.mutateAsync(uuid);
      toast.success(quality?.estado === "ERROR" ? "Reintento de calidad enviado." : "Control de calidad iniciado.", { description: "Se revisarán duplicados, consistencia y confianza." });
    } catch (error) {
      toast.error("No se pudo iniciar el control de calidad.", { description: getApiErrorMessage(error) });
    }
  }

  const canProcess = document.estado === "PENDIENTE_PROCESAMIENTO" || document.estado === "ERROR";
  const needsReview = ["PENDIENTE_APROBACION", "PENDIENTE_REVISION", "PENDIENTE_REVISION_RAPIDA", "OBSERVADO", "ERROR_CONVERSION"].includes(document.estado);
  const finalized = document.estado === "FINALIZADO" && document.conversion?.estado === "COMPLETADA";
  const statusCopy = finalized
    ? { title: "Documento finalizado", description: "El archivo Word está listo para descargar.", icon: CheckCircle2, tone: "border-emerald-300 bg-emerald-50/50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100" }
    : needsReview
      ? { title: "Necesita revisión", description: "Revise los datos jurídicos señalados y apruebe la ficha para continuar.", icon: Scale, tone: "border-amber-300 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-100" }
      : canProcess
        ? { title: "Pendiente de iniciar", description: "Inicie la lectura del PDF. El resto del proceso continuará automáticamente.", icon: Play, tone: "border-sky-300 bg-sky-50/50 text-sky-900 dark:bg-sky-950/20 dark:text-sky-100" }
        : { title: "Procesando documento", description: "El sistema está leyendo, clasificando y preparando el archivo automáticamente.", icon: LoaderCircle, tone: "border-violet-300 bg-violet-50/50 text-violet-900 dark:bg-violet-950/20 dark:text-violet-100" };
  const StatusIcon = statusCopy.icon;
  return <div className="flex flex-col gap-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
      <div className="flex items-start gap-3"><Button variant="outline" size="icon" onClick={() => router.push("/dashboard/documentos")}><ArrowLeft /></Button><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono font-semibold">{document.codigo_interno}</span><DocumentoStatusBadge estado={document.estado} /></div><h1 className="mt-2 text-3xl tracking-tight">{original?.nombre_original ?? "Documento sin archivo"}</h1><p className="text-muted-foreground">{document.tipo_origen_display}</p></div></div>
      <div className="flex flex-wrap gap-2">{finalized ? <Button onClick={() => router.push(`/dashboard/documentos/${uuid}/archivo-final`)}><FileOutput /> Descargar Word</Button> : null}{needsReview ? <Button onClick={() => router.push(`/dashboard/revision-juridica/${uuid}`)}><Scale /> Revisar documento</Button> : null}{canProcess ? <Button onClick={() => void startProcessing()} disabled={mutations.process.isPending || mutations.retry.isPending || working}>{document.estado === "ERROR" ? <RefreshCw /> : <Play />}{document.estado === "ERROR" ? "Volver a intentar" : "Iniciar procesamiento"}</Button> : null}<Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => void discardDocument()} disabled={mutations.discard.isPending || working || extracting || checkingQuality}><Trash2 /> Descartar</Button></div>
    </div>

    <Card className={`border ${statusCopy.tone}`}><CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background/80"><StatusIcon className={working || extracting || checkingQuality ? "size-6 animate-spin" : "size-6"} /></span><div className="flex-1"><h2 className="text-lg font-semibold">{statusCopy.title}</h2><p className="text-sm opacity-80">{statusCopy.description}</p></div>{needsReview ? <Button onClick={() => router.push(`/dashboard/revision-juridica/${uuid}`)}>Revisar ahora</Button> : null}</CardContent></Card>

    {proposalQuery.data?.estado === "COMPLETADA" ? <Card><CardHeader><CardTitle>Datos jurídicos encontrados</CardTitle><CardDescription>Esta es la información principal que utilizará el sistema.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ProposalValue label="Tipo de norma" value={proposalQuery.data.tipo_norma_propuesto?.nombre} /><ProposalValue label="Número" value={proposalQuery.data.numero_propuesto} /><ProposalValue label="Fecha" value={proposalQuery.data.fecha_emision_propuesta} /><ProposalValue label="Materia" value={proposalQuery.data.materia_propuesta?.nombre} /></CardContent></Card> : null}

    <PdfViewer title="PDF original" description="Documento recibido sin modificaciones." url={document.archivo_original_url} fileName={original?.nombre_original ?? document.codigo_interno} />

    <Collapsible>
      <CollapsibleTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="flex items-center gap-2"><Settings2 /> Detalles técnicos para administración</span><span className="text-xs text-muted-foreground">OCR, controles e historial</span></Button></CollapsibleTrigger>
      <CollapsibleContent className="mt-5 space-y-5">

    <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><FileCheck2 className="size-5" /> Procesamiento técnico</CardTitle><CardDescription className="mt-1">Análisis de texto, OCR y preparación para la extracción jurídica.</CardDescription></div>{result ? <Badge variant="outline">{result.estado_display}</Badge> : null}</div></CardHeader><CardContent>{result ? <TechnicalResult result={result} /> : <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center"><FileSearch className="size-8 text-muted-foreground" /><div><p className="font-medium">Este PDF todavía no fue procesado</p><p className="text-muted-foreground text-sm">Inicie el proceso para detectar texto y aplicar OCR cuando sea necesario.</p></div>{canProcess ? <Button onClick={() => void startProcessing()} disabled={mutations.process.isPending}><Play /> Procesar PDF</Button> : null}</div>}</CardContent></Card>

    <Card><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Propuesta jurídica automática</CardTitle><CardDescription className="mt-1">Sugerencias explicables que deben ser revisadas por un profesional.</CardDescription></div>{extraction ? <Badge variant="outline">{extraction.estado_display}</Badge> : null}</div></CardHeader><CardContent>
      {extracting ? <div className="flex items-center gap-3 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4"><LoaderCircle className="size-5 animate-spin text-violet-600" /><div><p className="font-medium">{extraction?.estado_display}</p><p className="text-muted-foreground text-sm">Analizando tipo, número, fecha, título, objeto, efecto, materia y entidad.</p></div></div> : null}
      {extraction?.estado === "ERROR" ? <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4"><div><p className="font-medium text-destructive">{extraction.error_codigo.trim() ? extraction.error_codigo : "Error de extracción"}</p><p className="mt-1 text-sm">{extraction.error_mensaje}</p></div><Button variant="outline" onClick={() => void startExtraction()} disabled={mutations.retryExtraction.isPending}><RefreshCw /> Reintentar extracción</Button></div> : null}
      {proposalQuery.data?.estado === "COMPLETADA" ? <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><ProposalValue label="Tipo de norma" value={proposalQuery.data.tipo_norma_propuesto?.nombre} /><ProposalValue label="Número" value={proposalQuery.data.numero_propuesto} /><ProposalValue label="Fecha" value={proposalQuery.data.fecha_emision_propuesta} /><ProposalValue label="Materia" value={proposalQuery.data.materia_propuesta?.nombre} /></div><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 p-4"><p className="text-sm"><span className="font-medium">Confianza global:</span> {proposalQuery.data.confianza_global ? `${Number(proposalQuery.data.confianza_global).toFixed(2)} %` : "No disponible"}. La ficha definitiva continúa sin cambios.</p><Button onClick={() => router.push(`/dashboard/documentos/${uuid}/propuesta`)}><Scale /> Revisar propuesta y evidencias</Button></div></div> : null}
      {!extraction && document.estado === "PENDIENTE_EXTRACCION" ? <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-7 text-center"><Sparkles className="size-8 text-muted-foreground" /><div><p className="font-medium">El texto está listo para analizar</p><p className="text-muted-foreground text-sm">Genere una propuesta sin modificar la ficha jurídica definitiva.</p></div><Button onClick={() => void startExtraction()} disabled={mutations.extract.isPending}><Sparkles /> Extraer datos jurídicos</Button></div> : null}
    </CardContent></Card>

    <Card className="overflow-hidden"><CardHeader className="border-b bg-slate-950 text-white dark:bg-slate-900"><div className="flex items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-cyan-300" /> Control de calidad y duplicados</CardTitle><CardDescription className="mt-1 text-slate-300">Filtro previo a la conversión final: identidad, consistencia y calidad documental.</CardDescription></div>{quality ? <Badge className="border-white/20 bg-white/10 text-white" variant="outline">{quality.estado_display}</Badge> : null}</div></CardHeader><CardContent className="p-5">
      {checkingQuality ? <div className="flex items-center gap-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5"><div className="relative"><ShieldCheck className="size-9 text-cyan-600" /><LoaderCircle className="absolute -right-2 -bottom-2 size-4 animate-spin text-cyan-600" /></div><div><p className="font-semibold">{quality?.estado_display}</p><p className="text-muted-foreground text-sm">Comparando hash, identidad normativa, contenido, OCR y evidencias.</p></div></div> : null}
      {quality?.estado === "ERROR" ? <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5"><ShieldAlert className="size-7 text-destructive" /><div><p className="font-semibold">{quality.error_codigo.trim() ? quality.error_codigo : "Error de calidad"}</p><p className="text-muted-foreground text-sm">{quality.error_mensaje}</p></div><Button variant="outline" onClick={() => void startQuality()} disabled={mutations.retryQuality.isPending}><RefreshCw /> Reintentar control</Button></div> : null}
      {qualityQuery.data?.estado === "COMPLETADA" ? <div className="grid gap-5 lg:grid-cols-[10rem_minmax(0,1fr)_auto] lg:items-center"><QualityDial score={Number(qualityQuery.data.puntuacion_calidad ?? 0)} /><div><p className="font-semibold text-lg">{qualityQuery.data.resultado_display}</p><p className="mt-1 text-muted-foreground text-sm">{qualityQuery.data.total_alertas === 0 ? "No se detectaron riesgos antes de la conversión." : `${qualityQuery.data.total_alertas} alertas: ${qualityQuery.data.alertas_graves} graves y ${qualityQuery.data.alertas_leves} leves.`}</p><div className="mt-3 flex gap-2"><Badge variant="outline" className="border-red-500/30 text-red-700">{qualityQuery.data.alertas_graves} graves</Badge><Badge variant="outline" className="border-amber-500/30 text-amber-700">{qualityQuery.data.alertas_leves} leves</Badge></div></div><Button onClick={() => router.push(`/dashboard/documentos/${uuid}/calidad`)}><Gauge /> Abrir panel de calidad</Button></div> : null}
      {!quality && document.estado === "PENDIENTE_REVISION" ? <div className="grid gap-5 rounded-xl border border-dashed p-6 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"><div className="rounded-2xl bg-slate-950 p-4 text-cyan-300"><Gauge className="size-7" /></div><div><p className="font-semibold">La propuesta está lista para su control</p><p className="text-muted-foreground text-sm">Buscaremos duplicados exactos, normas coincidentes y señales de baja calidad.</p></div><Button onClick={() => void startQuality()} disabled={mutations.quality.isPending}><ShieldCheck /> Ejecutar control</Button></div> : null}
    </CardContent></Card>

    <ConversionFinalCard uuid={uuid} />

    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="space-y-4"><Card><CardHeader><CardTitle>Datos de recepción</CardTitle></CardHeader><CardContent><dl className="space-y-5"><div><dt className="text-muted-foreground text-xs uppercase">Estado</dt><dd className="mt-1">{document.estado_display}</dd></div><div><dt className="text-muted-foreground text-xs uppercase">Origen</dt><dd className="mt-1">{document.tipo_origen_display}</dd></div><div><dt className="text-muted-foreground text-xs uppercase">Fecha de carga</dt><dd className="mt-1">{dateTime.format(new Date(document.fecha_recepcion))}</dd></div><div><dt className="text-muted-foreground text-xs uppercase">Tamaño</dt><dd className="mt-1">{original ? size(original.tamano_bytes) : "-"}</dd></div><div><dt className="text-muted-foreground text-xs uppercase">SHA-256</dt><dd className="mt-1 break-all font-mono text-xs">{original?.hash_sha256 ?? "-"}</dd></div></dl></CardContent></Card>
      <Card><CardHeader><CardTitle>Historial</CardTitle></CardHeader><CardContent className="max-h-80 space-y-4 overflow-y-auto">{document.historial.map((entry) => <div key={entry.id} className="border-l-2 pl-3"><p className="font-medium text-sm">{entry.accion_display}</p><p className="text-muted-foreground text-xs">{entry.descripcion}</p><p className="mt-1 text-muted-foreground text-xs">{dateTime.format(new Date(entry.created_at))}</p></div>)}</CardContent></Card></div>
      {processedUrl ? <PdfViewer title="PDF procesado" description="Versión preparada para lectura automática." url={processedUrl} fileName={`${document.codigo_interno} procesado`} /> : null}
    </div>
      </CollapsibleContent>
    </Collapsible>
  </div>;
}

function PdfViewer({ title, description, url, fileName }: { title: string; description: string; url: string; fileName: string }) {
  return <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileText className="size-5" /> {title}</CardTitle><CardDescription>{description}</CardDescription><div className="flex gap-2 pt-2"><Button variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink /> Abrir</a></Button><Button variant="outline" asChild><a href={`${url}?download=1`}><Download /> Descargar</a></Button></div></CardHeader><CardContent className="p-0"><iframe title={fileName} src={url} className="h-[72vh] w-full border-0" /></CardContent></Card>;
}

function ProposalValue({ label, value }: { label: string; value?: string | null }) {
  return <div className="rounded-lg border p-4"><p className="text-muted-foreground text-xs uppercase">{label}</p><p className="mt-1 truncate font-semibold">{value?.trim() ? value : "No detectado"}</p></div>;
}

function QualityDial({ score }: { score: number }) {
  let color = "#ef4444";
  if (score >= 85) color = "#10b981";
  else if (score >= 60) color = "#f59e0b";
  return <div className="mx-auto grid size-32 place-items-center rounded-full p-2" style={{ background: `conic-gradient(${color} ${score * 3.6}deg, color-mix(in oklab, var(--muted) 70%, transparent) 0deg)` }}><div className="grid size-full place-items-center rounded-full bg-background text-center shadow-inner"><div><p className="font-bold text-2xl">{score.toFixed(0)}</p><p className="text-[10px] text-muted-foreground uppercase">calidad</p></div></div></div>;
}
