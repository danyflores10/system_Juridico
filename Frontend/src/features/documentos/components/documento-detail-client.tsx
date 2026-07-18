"use client";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Download,
  ExternalLink,
  FileOutput,
  FileText,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Play,
  RefreshCw,
  Scale,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/client";

import { useDocumento, usePropuestaExtraccion, useResultadoConversion } from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";

const legalDate = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatLegalDate(value?: string | null) {
  if (!value) return "Sin registrar";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : legalDate.format(parsed);
}

function buildLegalHeading(type?: string | null, documentNumber?: string | null, title?: string | null) {
  const normalizedType = type?.trim();
  const normalizedNumber = documentNumber?.trim();
  if (normalizedType && normalizedNumber) return `${normalizedType} N.º ${normalizedNumber}`;
  if (normalizedType) return normalizedType;
  if (title?.trim()) return title.trim();
  return "Documento jurídico";
}

export function DocumentoDetailClient({ uuid }: { uuid: string }) {
  const router = useRouter();
  const query = useDocumento(uuid);
  const proposalQuery = usePropuestaExtraccion(uuid, Boolean(query.data?.extraccion));
  const conversionQuery = useResultadoConversion(uuid, Boolean(query.data?.conversion));
  const mutations = useDocumentoMutations();

  if (query.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-14 w-96 max-w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se pudo cargar el documento</CardTitle>
          <CardDescription>{getApiErrorMessage(query.error)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const document = query.data;
  const proposal = proposalQuery.data?.estado === "COMPLETADA" ? proposalQuery.data : null;
  const legalHeading = buildLegalHeading(
    proposal?.tipo_norma_propuesto?.nombre,
    proposal?.numero_propuesto,
    proposal?.titulo_propuesto,
  );
  const formattedDate = formatLegalDate(proposal?.fecha_emision_propuesta);
  const matter = proposal?.materia_propuesta?.nombre?.trim() || "Materia sin registrar";
  const needsReview = [
    "PENDIENTE_APROBACION",
    "PENDIENTE_REVISION",
    "PENDIENTE_REVISION_RAPIDA",
    "OBSERVADO",
    "ERROR_CONVERSION",
  ].includes(document.estado);
  const canProcess = document.estado === "PENDIENTE_PROCESAMIENTO" || document.estado === "ERROR";
  const finalized = document.estado === "FINALIZADO" && document.conversion?.estado === "COMPLETADA";
  const isBusy = ["PROCESANDO", "PENDIENTE_EXTRACCION", "CONTROL_CALIDAD", "CONVIRTIENDO"].includes(document.estado);
  const wordUrl = conversionQuery.data?.archivo_url;
  const consultationPdfUrl = conversionQuery.data?.archivo_pdf_url;

  async function startProcessing() {
    try {
      if (document.estado === "ERROR") await mutations.retry.mutateAsync(uuid);
      else await mutations.process.mutateAsync(uuid);
      toast.success(document.estado === "ERROR" ? "Se volvió a iniciar la preparación." : "Preparación iniciada.", {
        description: "La ficha jurídica se actualizará cuando el documento esté listo.",
      });
    } catch (error) {
      toast.error("No se pudo preparar el documento.", { description: getApiErrorMessage(error) });
    }
  }

  async function discardDocument() {
    if (!window.confirm("¿Desea descartar este documento? El PDF fuente se conservará.")) return;
    try {
      await mutations.discard.mutateAsync(uuid);
      toast.success("Documento descartado.");
      router.push("/dashboard/documentos");
    } catch (error) {
      toast.error("No se pudo descartar el documento.", { description: getApiErrorMessage(error) });
    }
  }

  let statusCopy = {
    label: "En preparación",
    title: "Preparando la ficha jurídica",
    description: "La información aparecerá aquí cuando el documento esté listo para su consulta.",
    icon: LoaderCircle,
    tone: "border-violet-300 bg-violet-50/60 text-violet-950 dark:bg-violet-950/20 dark:text-violet-100",
  };

  if (canProcess) {
    statusCopy = {
      label: document.estado === "ERROR" ? "Requiere atención" : "Pendiente",
      title: document.estado === "ERROR" ? "No se pudo preparar el documento" : "Documento pendiente de preparación",
      description:
        document.estado === "ERROR"
          ? "Vuelva a intentarlo para generar la ficha jurídica."
          : "Inicie la preparación para obtener la información jurídica del documento.",
      icon: document.estado === "ERROR" ? RefreshCw : Play,
      tone: "border-sky-300 bg-sky-50/60 text-sky-950 dark:bg-sky-950/20 dark:text-sky-100",
    };
  }

  if (needsReview) {
    statusCopy = {
      label: "Revisión pendiente",
      title: "La ficha necesita revisión jurídica",
      description: "Verifique la información de la norma y confirme los datos antes de continuar.",
      icon: Scale,
      tone: "border-amber-300 bg-amber-50/60 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100",
    };
  }

  if (finalized) {
    statusCopy = {
      label: "Listo para consulta",
      title: "Documento jurídico disponible",
      description: "La ficha jurídica está completa y la versión Word se encuentra disponible.",
      icon: CheckCircle2,
      tone: "border-emerald-300 bg-emerald-50/60 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100",
    };
  }
  const StatusIcon = statusCopy.icon;

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Volver a documentos"
            onClick={() => router.push("/dashboard/documentos")}
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <Badge variant="outline" className="mb-3 rounded-full px-3 py-1">
              {statusCopy.label}
            </Badge>
            <h1 className="text-balance font-semibold text-3xl tracking-tight lg:text-4xl">{legalHeading}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground">
              <span className="flex items-center gap-2">
                <Tags className="size-4" />
                {matter}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {finalized ? (
            <Button size="lg" asChild={Boolean(wordUrl)} disabled={!wordUrl}>
              {wordUrl ? (
                <a href={wordUrl}>
                  <Download /> Descargar versión Word
                </a>
              ) : (
                <DownloadFallback
                  pending={conversionQuery.isPending}
                  pendingLabel="Preparando descarga"
                  unavailableLabel="Word no disponible"
                  icon={Download}
                />
              )}
            </Button>
          ) : null}
          {finalized ? (
            <Button variant="outline" size="lg" asChild={Boolean(consultationPdfUrl)} disabled={!consultationPdfUrl}>
              {consultationPdfUrl ? (
                <a href={consultationPdfUrl}>
                  <FileText /> Descargar PDF consultable
                </a>
              ) : (
                <DownloadFallback
                  pending={conversionQuery.isPending}
                  pendingLabel="Preparando PDF"
                  unavailableLabel="PDF no disponible"
                  icon={FileText}
                />
              )}
            </Button>
          ) : null}
          {needsReview ? (
            <Button size="lg" onClick={() => router.push(`/dashboard/revision-juridica/${uuid}`)}>
              <Scale /> Revisar ficha jurídica
            </Button>
          ) : null}
          {canProcess ? (
            <Button
              size="lg"
              onClick={() => void startProcessing()}
              disabled={mutations.process.isPending || mutations.retry.isPending}
            >
              {document.estado === "ERROR" ? <RefreshCw /> : <Play />}
              {document.estado === "ERROR" ? "Volver a intentar" : "Preparar documento"}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-lg" aria-label="Más acciones">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                variant="destructive"
                disabled={isBusy || mutations.discard.isPending}
                onSelect={() => void discardDocument()}
              >
                <Trash2 /> Descartar documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Card className={`border ${statusCopy.tone}`}>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background/80">
            <StatusIcon className={`size-6 ${isBusy ? "animate-spin" : ""}`} />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">{statusCopy.title}</h2>
            <p className="mt-1 text-sm opacity-80">{statusCopy.description}</p>
          </div>
          {needsReview ? (
            <Button onClick={() => router.push(`/dashboard/revision-juridica/${uuid}`)}>Revisar ahora</Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <BookOpenText className="size-5" />
            </span>
            <div>
              <CardTitle>Ficha jurídica</CardTitle>
              <CardDescription className="mt-1">
                Información esencial para identificar y consultar el documento.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          {proposal ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <LegalValue label="Tipo de norma" value={proposal.tipo_norma_propuesto?.nombre} />
                <LegalValue label="Número" value={proposal.numero_propuesto} />
                <LegalValue label="Fecha de emisión" value={formattedDate} />
                <LegalValue label="Materia" value={proposal.materia_propuesta?.nombre} />
                <LegalValue label="Entidad emisora" value={proposal.entidad_emisora_propuesta?.nombre} icon="entity" />
                <LegalValue label="Efecto normativo" value={proposal.efecto_normativo_propuesto?.nombre} />
              </div>

              {proposal.titulo_propuesto?.trim() ? (
                <LegalText label="Título oficial" value={proposal.titulo_propuesto} />
              ) : null}
              {proposal.objeto_propuesto?.trim() ? (
                <LegalText label="Objeto de la norma" value={proposal.objeto_propuesto} />
              ) : null}
            </>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center">
              <BookOpenText className="mb-3 size-8 text-muted-foreground" />
              <p className="font-medium">La ficha jurídica aún no está disponible</p>
              <p className="mt-1 max-w-xl text-muted-foreground text-sm">
                Podrá consultar los datos principales cuando finalice la preparación del documento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <PdfSourceViewer url={document.archivo_original_url} title={legalHeading} />
    </div>
  );
}

function DownloadFallback({
  pending,
  pendingLabel,
  unavailableLabel,
  icon: Icon,
}: {
  pending: boolean;
  pendingLabel: string;
  unavailableLabel: string;
  icon: typeof Download;
}) {
  if (pending) {
    return (
      <>
        <LoaderCircle className="animate-spin" /> {pendingLabel}
      </>
    );
  }
  return (
    <>
      <Icon /> {unavailableLabel}
    </>
  );
}

function LegalValue({ label, value, icon }: { label: string; value?: string | null; icon?: "entity" }) {
  return (
    <div className="rounded-xl border bg-muted/10 p-4">
      <p className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
        {icon === "entity" ? <Landmark className="size-3.5" /> : null}
        {label}
      </p>
      <p className="mt-2 font-semibold leading-6">{value?.trim() ? value : "Sin registrar"}</p>
    </div>
  );
}

function LegalText({ label, value }: { label: string; value: string }) {
  return (
    <section className="border-t pt-5">
      <h3 className="font-semibold text-sm">{label}</h3>
      <p className="mt-2 max-w-5xl text-muted-foreground leading-7">{value}</p>
    </section>
  );
}

function PdfSourceViewer({ url, title }: { url: string; title: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-muted p-2.5">
              <FileText className="size-5" />
            </span>
            <div>
              <CardTitle>Documento fuente</CardTitle>
              <CardDescription className="mt-1">
                Consulte el PDF recibido para contrastar la información de la ficha jurídica.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={url} target="_blank" rel="noreferrer">
                <ExternalLink /> Ver en otra pestaña
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={`${url}?download=1`}>
                <FileOutput /> Descargar PDF
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <iframe title={`Documento fuente: ${title}`} src={url} className="h-[72vh] w-full border-0 bg-muted/20" />
      </CardContent>
    </Card>
  );
}
