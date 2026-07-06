"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clipboard, FileSearch, Info, LoaderCircle, RefreshCw, Scale, ScanText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/client";
import { useDocumento, usePropuestaExtraccion } from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import type { EvidenciaExtraccion, PropuestaExtraccion } from "../types/documentos.types";

type ProposedField = { key: string; label: string; value: string };

export function PropuestaJuridicaClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const document = useDocumento(uuid);
  const proposal = usePropuestaExtraccion(uuid);
  const retry = useDocumentoMutations().retryExtraction;

  async function retryExtraction() {
    try { await retry.mutateAsync(uuid); toast.success("Reintento de extracción enviado."); }
    catch (error) { toast.error("No se pudo reintentar.", { description: getApiErrorMessage(error) }); }
  }

  async function copyProposal() {
    if (!proposal.data) return;
    try { await navigator.clipboard.writeText(buildProposalText(proposal.data)); toast.success("Propuesta copiada."); }
    catch { toast.error("No se pudo copiar la propuesta."); }
  }

  if (proposal.isLoading || document.isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-96" /><Skeleton className="h-28 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (proposal.isError || !proposal.data) return <Card><CardHeader><CardTitle>No se pudo cargar la propuesta</CardTitle><CardDescription>{getApiErrorMessage(proposal.error)}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /> Volver al documento</Button></CardContent></Card>;
  const data = proposal.data;
  if (data.estado === "EN_COLA" || data.estado === "EXTRAYENDO") return <Card><CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 text-center"><LoaderCircle className="size-10 animate-spin text-primary" /><h1 className="font-semibold text-xl">{data.estado_display}</h1><p className="text-muted-foreground">La propuesta aparecerá aquí cuando Celery termine. La vista se actualiza automáticamente.</p></CardContent></Card>;
  if (data.estado === "ERROR") return <Card><CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"><FileSearch className="size-10 text-destructive" /><div><h1 className="font-semibold text-xl">{data.error_codigo.trim() ? data.error_codigo : "Error de extracción"}</h1><p className="mt-1 text-muted-foreground">{data.error_mensaje}</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /> Volver</Button><Button onClick={() => void retryExtraction()} disabled={retry.isPending}><RefreshCw /> Reintentar</Button></div></CardContent></Card>;

  const fields = proposalFields(data);
  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="flex items-start gap-3"><Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /></Button><div><div className="flex flex-wrap items-center gap-2"><Scale className="size-6" /><h1 className="text-3xl tracking-tight">Propuesta jurídica automática</h1><Badge variant="outline">{data.estado_display}</Badge></div><p className="mt-1 text-muted-foreground">{document.data?.codigo_interno} · {document.data?.nombre_archivo}</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}/texto`)}><ScanText /> Ver texto completo</Button><Button onClick={() => void copyProposal()}><Clipboard /> Copiar propuesta</Button></div></div>

    <Alert><Info /><AlertTitle>Propuesta pendiente de revisión profesional</AlertTitle><AlertDescription>Los valores fueron sugeridos mediante reglas y catálogos. Todavía no forman parte de la ficha jurídica definitiva.</AlertDescription></Alert>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Confianza global" value={data.confianza_global ? `${Number(data.confianza_global).toFixed(2)} %` : "No disponible"} /><Summary label="Campos detectados" value={`${data.detalles_tecnicos.campos_detectados ?? fields.filter((field) => field.value).length} de ${data.detalles_tecnicos.campos_totales ?? 8}`} /><Summary label="Evidencias" value={String(data.evidencias.length)} /><Summary label="Intentos" value={String(data.intentos)} /></div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Datos sugeridos y evidencias</CardTitle><CardDescription>Abra un campo para conocer exactamente por qué fue propuesto.</CardDescription></CardHeader><CardContent className="p-0"><Accordion type="multiple">{fields.map((field) => <FieldEvidence key={field.key} field={field} evidence={data.evidencias.find((item) => item.campo === field.key)} onViewText={() => router.push(`/dashboard/documentos/${uuid}/texto`)} />)}</Accordion></CardContent></Card>
  </div>;
}

function FieldEvidence({ field, evidence, onViewText }: { field: ProposedField; evidence?: EvidenciaExtraccion; onViewText: () => void }) {
  const confidence = evidence ? Number(evidence.confianza) : null;
  return <AccordionItem value={field.key}><AccordionTrigger className="px-6 py-4 hover:no-underline"><div className="grid flex-1 gap-2 pr-4 text-left sm:grid-cols-[11rem_minmax(0,1fr)_7rem] sm:items-center"><span className="text-muted-foreground text-xs uppercase">{field.label}</span><span className="truncate font-semibold">{field.value.trim() ? field.value : "No detectado"}</span><span className="text-muted-foreground text-xs">{confidence == null ? "Sin evidencia" : `${confidence.toFixed(2)} %`}</span></div></AccordionTrigger><AccordionContent className="px-6 pb-6">{evidence ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]"><div><p className="mb-2 font-medium text-sm">Fragmento encontrado</p><blockquote className="rounded-lg border-l-4 bg-muted/30 p-4 text-sm leading-6">{evidence.fragmento.trim() ? evidence.fragmento : "La sugerencia fue inferida sin un fragmento textual directo."}</blockquote></div><dl className="space-y-4 rounded-lg border p-4 text-sm"><div><dt className="text-muted-foreground text-xs uppercase">Página</dt><dd className="mt-1 font-medium">{evidence.numero_pagina ?? "Inferencia general"}</dd></div><div><dt className="text-muted-foreground text-xs uppercase">Regla aplicada</dt><dd className="mt-1">{evidence.regla_aplicada}</dd></div><div><dt className="text-muted-foreground text-xs uppercase">Valor guardado</dt><dd className="mt-1 font-medium">{evidence.valor_propuesto}</dd></div>{evidence.numero_pagina ? <Button variant="outline" size="sm" onClick={onViewText}><ScanText /> Consultar texto</Button> : null}</dl></div> : <div className="rounded-lg border border-dashed p-5 text-center text-muted-foreground">El motor no encontró evidencia suficiente para sugerir este campo.</div>}</AccordionContent></AccordionItem>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-muted-foreground text-xs uppercase">{label}</p><p className="mt-1 font-semibold text-xl">{value}</p></CardContent></Card>;
}

function proposalFields(data: PropuestaExtraccion): ProposedField[] {
  return [
    { key: "TIPO_NORMA", label: "Tipo de norma", value: data.tipo_norma_propuesto ? `${data.tipo_norma_propuesto.codigo} · ${data.tipo_norma_propuesto.nombre}` : "" },
    { key: "NUMERO", label: "Número", value: data.numero_propuesto },
    { key: "FECHA_EMISION", label: "Fecha de emisión", value: data.fecha_emision_propuesta ?? "" },
    { key: "TITULO", label: "Título", value: data.titulo_propuesto },
    { key: "OBJETO", label: "Objeto / Artículo 1", value: data.objeto_propuesto },
    { key: "EFECTO_NORMATIVO", label: "Efecto normativo", value: data.efecto_normativo_propuesto ? `${data.efecto_normativo_propuesto.codigo} · ${data.efecto_normativo_propuesto.nombre}` : "" },
    { key: "MATERIA", label: "Materia", value: data.materia_propuesta?.nombre ?? "" },
    { key: "ENTIDAD_EMISORA", label: "Entidad emisora", value: data.entidad_emisora_propuesta ? `${data.entidad_emisora_propuesta.sigla ?? data.entidad_emisora_propuesta.codigo} · ${data.entidad_emisora_propuesta.nombre}` : "" },
  ];
}

function buildProposalText(data: PropuestaExtraccion) {
  return proposalFields(data).map((field) => `${field.label}: ${field.value.trim() ? field.value : "No detectado"}`).join("\n");
}
