"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clipboard, Download, FileSearch, LoaderCircle, Search, ScanText } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/client";
import { useDocumento, useResultadoProcesamiento } from "../hooks/use-documentos";
import type { TextoPagina } from "../types/documentos.types";

type MethodFilter = "TODOS" | TextoPagina["metodo"];

export function TextoExtraidoClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const document = useDocumento(uuid);
  const result = useResultadoProcesamiento(uuid);
  const [query, setQuery] = React.useState("");
  const [method, setMethod] = React.useState<MethodFilter>("TODOS");
  const [copied, setCopied] = React.useState(false);
  const pages = React.useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return (result.data?.paginas ?? []).filter((page) => {
      const matchesMethod = method === "TODOS" || page.metodo === method;
      const matchesQuery = !term || page.texto.toLocaleLowerCase("es").includes(term);
      return matchesMethod && matchesQuery;
    });
  }, [method, query, result.data?.paginas]);

  async function copyText(text: string, message: string) {
    try { await navigator.clipboard.writeText(text); toast.success(message); }
    catch { toast.error("No se pudo copiar el texto."); }
  }

  async function copyAll() {
    const text = buildText(result.data?.paginas ?? []);
    await copyText(text, "Texto completo copiado.");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function downloadText() {
    const text = buildText(result.data?.paginas ?? []);
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${document.data?.codigo_interno ?? "documento"}_texto_extraido.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (result.isLoading || document.isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-96" /><Skeleton className="h-20 w-full" /><Skeleton className="h-96 w-full" /></div>;
  if (result.isError || !result.data) return <Card><CardHeader><CardTitle>No se pudo cargar el texto extraído</CardTitle><CardDescription>{getApiErrorMessage(result.error)}</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /> Volver al documento</Button></CardContent></Card>;
  if (result.data.estado === "EN_COLA" || result.data.estado === "PROCESANDO") return <Card><CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><LoaderCircle className="size-9 animate-spin text-primary" /><h1 className="font-semibold text-xl">El texto se está preparando</h1><p className="text-muted-foreground">Esta página se actualizará automáticamente cuando termine Celery.</p></CardContent></Card>;

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="flex items-start gap-3"><Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}><ArrowLeft /></Button><div><div className="flex items-center gap-2"><ScanText className="size-6" /><h1 className="text-3xl tracking-tight">Texto extraído</h1></div><p className="mt-1 text-muted-foreground">{document.data?.codigo_interno} · {document.data?.nombre_archivo}</p></div></div><div className="flex gap-2"><Button variant="outline" onClick={() => void copyAll()}>{copied ? <Check /> : <Clipboard />} Copiar todo</Button><Button onClick={downloadText}><Download /> Descargar TXT</Button></div></div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Páginas" value={String(result.data.numero_paginas)} /><Summary label="Caracteres" value={new Intl.NumberFormat("es-BO").format(result.data.caracteres_extraidos)} /><Summary label="Origen" value={result.data.tipo_pdf_display} /><Summary label="Confianza OCR" value={result.data.confianza_ocr ? `${Number(result.data.confianza_ocr).toFixed(2)} %` : "No aplica"} /></div>

    <Card><CardContent className="flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar dentro del texto extraído..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><NativeSelect value={method} onChange={(event) => setMethod(event.target.value as MethodFilter)}><NativeSelectOption value="TODOS">Todas las páginas</NativeSelectOption><NativeSelectOption value="TEXTO_ORIGINAL">Texto original</NativeSelectOption><NativeSelectOption value="OCR">Texto reconocido por OCR</NativeSelectOption></NativeSelect></CardContent></Card>

    <Card><CardHeader><CardTitle>Páginas del documento</CardTitle><CardDescription>{pages.length} de {result.data.paginas.length} páginas visibles. Abra solo las que necesite revisar.</CardDescription></CardHeader><CardContent className="p-0">{pages.length ? <Accordion type="multiple" defaultValue={pages.length === 1 ? [`page-${pages[0].numero_pagina}`] : []}>{pages.map((page) => <AccordionItem key={page.numero_pagina} value={`page-${page.numero_pagina}`}><AccordionTrigger className="px-6 py-4 hover:no-underline"><div className="flex flex-1 flex-wrap items-center gap-3 text-left"><span className="font-semibold">Página {page.numero_pagina}</span><Badge variant="secondary">{page.metodo_display}</Badge>{page.confianza_ocr ? <span className="text-muted-foreground text-xs">Confianza {Number(page.confianza_ocr).toFixed(2)} %</span> : null}<span className="mr-3 ml-auto text-muted-foreground text-xs">{page.caracteres} caracteres</span></div></AccordionTrigger><AccordionContent className="px-6 pb-6"><div className="mb-3 flex justify-end"><Button variant="outline" size="sm" onClick={() => void copyText(page.texto, `Página ${page.numero_pagina} copiada.`)}><Clipboard /> Copiar página</Button></div><pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/20 p-5 font-sans text-sm leading-7">{page.texto || "Esta página no contiene texto."}</pre></AccordionContent></AccordionItem>)}</Accordion> : <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><FileSearch className="size-9 text-muted-foreground" /><p className="font-medium">No se encontraron coincidencias</p><p className="text-muted-foreground text-sm">Cambie la búsqueda o el filtro aplicado.</p></div>}</CardContent></Card>
  </div>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-4"><p className="text-muted-foreground text-xs uppercase">{label}</p><p className="mt-1 font-semibold text-lg">{value}</p></CardContent></Card>;
}

function buildText(pages: TextoPagina[]) {
  return pages.map((page) => `--- Página ${page.numero_pagina} (${page.metodo_display}) ---\n${page.texto}`).join("\n\n");
}
