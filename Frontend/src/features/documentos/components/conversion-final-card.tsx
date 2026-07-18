"use client";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileOutput,
  FileText,
  FolderOpen,
  Hash,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useDocumento, useResultadoConversion } from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import type { DocumentoDetail, ResultadoConversion } from "../types/documentos.types";

const dateTime = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" });

export function ConversionFinalCard({ uuid, standalone = false }: { uuid: string; standalone?: boolean }) {
  const router = useRouter();
  const documentQuery = useDocumento(uuid);
  const conversionQuery = useResultadoConversion(uuid, Boolean(documentQuery.data?.conversion));
  const mutations = useDocumentoMutations();

  if (documentQuery.isLoading) return <Skeleton className={standalone ? "h-[34rem] w-full" : "h-80 w-full"} />;
  if (documentQuery.isError || !documentQuery.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No se pudo cargar la conversión</CardTitle>
          <CardDescription>{getApiErrorMessage(documentQuery.error)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const document = documentQuery.data;
  const conversion = conversionQuery.data ?? document.conversion;
  const isWorking = conversion?.estado === "EN_COLA" || conversion?.estado === "CONVIRTIENDO";

  async function startConversion() {
    try {
      if (conversion?.estado === "ERROR") await mutations.retryConversion.mutateAsync(uuid);
      else await mutations.convert.mutateAsync(uuid);
      toast.success(conversion?.estado === "ERROR" ? "Reintento enviado." : "Conversión a Word iniciada.", {
        description: "El archivo se generará en segundo plano y esta vista se actualizará sola.",
      });
    } catch (error) {
      toast.error("No se pudo iniciar la conversión.", { description: getApiErrorMessage(error) });
    }
  }

  let body = (
    <ConversionGate
      document={document}
      onConvert={() => void startConversion()}
      onReview={() => router.push(`/dashboard/revision-juridica/${uuid}`)}
      pending={mutations.convert.isPending}
    />
  );
  if (conversion?.estado === "COMPLETADA") {
    body = conversionQuery.data ? (
      <CompletedConversion conversion={conversionQuery.data} />
    ) : (
      <WorkingConversion label="Cargando archivo final" />
    );
  } else if (isWorking) {
    body = <WorkingConversion label={conversion?.estado_display ?? "Preparando conversión"} />;
  } else if (conversion?.estado === "ERROR") {
    body = (
      <ErrorConversion
        conversion={conversion}
        onRetry={() => void startConversion()}
        pending={mutations.retryConversion.isPending}
      />
    );
  }

  return (
    <div className={cn(standalone && "mx-auto flex w-full max-w-7xl flex-col gap-5")}>
      {standalone ? (
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/documentos/${uuid}`)}>
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileOutput className="size-6" />
              <h1 className="text-3xl tracking-tight">Archivo jurídico final</h1>
              {conversion ? <Badge variant="outline">{conversion.estado_display}</Badge> : null}
            </div>
            <p className="mt-1 text-muted-foreground">
              {document.codigo_interno} · Conversión, nomenclatura y guardado por materia
            </p>
          </div>
        </div>
      ) : null}
      <Card className="overflow-hidden border-indigo-500/20 shadow-sm">
        <CardHeader className="border-b bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileOutput className="size-5 text-indigo-300" /> Word final y nomenclatura
              </CardTitle>
              <CardDescription className="mt-1 text-slate-300">
                Generación controlada del archivo definitivo en NORMATIVA EMITIDA.
              </CardDescription>
            </div>
            {conversion ? (
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                {conversion.estado_display}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                Paso 7
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">{body}</CardContent>
      </Card>
    </div>
  );
}

function ConversionGate({
  document,
  onConvert,
  onReview,
  pending,
}: {
  document: DocumentoDetail;
  onConvert: () => void;
  onReview: () => void;
  pending: boolean;
}) {
  const ready = document.estado === "LISTO_PARA_CONVERSION";
  const usesOcr = Boolean(document.procesamiento?.requirio_ocr);
  const checks = [
    { label: "PDF procesado", done: document.procesamiento?.estado === "COMPLETADO" },
    { label: "Extracción jurídica completada", done: document.extraccion?.estado === "COMPLETADA" },
    { label: "Control sin alertas graves", done: document.calidad?.resultado === "SIN_ALERTAS_GRAVES" },
    { label: "Ficha jurídica definitiva validada", done: ready },
  ];

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="p-6 lg:p-7">
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "rounded-2xl p-3",
              ready ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
            )}
          >
            {ready ? <ShieldCheck className="size-7" /> : <Clock3 className="size-7" />}
          </span>
          <div>
            <h3 className="font-semibold text-xl">
              {ready ? "Documento habilitado para conversión" : "Conversión todavía bloqueada"}
            </h3>
            <p className="mt-1 max-w-2xl text-muted-foreground text-sm leading-6">
              {ready
                ? "El control previo terminó correctamente. Puede crear el Word definitivo y guardarlo en la carpeta de su materia."
                : "El sistema protege la salida final hasta completar la revisión y los controles obligatorios."}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {checks.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3.5",
                item.done ? "border-emerald-500/20 bg-emerald-500/5" : "bg-muted/20",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full",
                  item.done ? "bg-emerald-500 text-white" : "border bg-background text-muted-foreground",
                )}
              >
                {item.done ? <Check className="size-4" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-center border-t bg-muted/20 p-6 lg:border-t-0 lg:border-l">
        <p className="text-muted-foreground text-xs uppercase tracking-widest">Salida prevista</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-xl bg-indigo-500/10 p-3">
            <FileText className="size-6 text-indigo-600" />
          </span>
          <div>
            <p className="font-semibold">{usesOcr ? "Word editable mediante OCR" : "Documento Word"}</p>
            <p className="text-muted-foreground text-sm">.docx · versión 1</p>
          </div>
        </div>
        <Button className="mt-6 w-full" size="lg" onClick={onConvert} disabled={!ready || pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />} Generar archivo final
        </Button>
        {!ready &&
        ["PENDIENTE_APROBACION", "PENDIENTE_REVISION", "PENDIENTE_REVISION_RAPIDA", "OBSERVADO"].includes(
          document.estado,
        ) ? (
          <Button className="mt-2 w-full" variant="outline" onClick={onReview}>
            <ShieldCheck /> Abrir revisión jurídica
          </Button>
        ) : null}
        {!ready ? (
          <p className="mt-3 text-center text-muted-foreground text-xs">
            Complete la revisión indicada para habilitar esta acción.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WorkingConversion({ label }: { label: string }) {
  return (
    <div className="grid min-h-80 gap-8 p-7 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
      <div className="relative mx-auto grid size-36 place-items-center rounded-full border-8 border-indigo-500/10">
        <LoaderCircle className="size-16 animate-spin text-indigo-600" />
        <span className="absolute -bottom-2 rounded-full border bg-background px-3 py-1 text-xs shadow-sm">Celery</span>
      </div>
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">Proceso en segundo plano</p>
        <h3 className="mt-2 font-semibold text-2xl">{label}</h3>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Convirtiendo el PDF, validando el DOCX, aplicando la nomenclatura jurídica y guardándolo sin sobrescribir
          versiones anteriores.
        </p>
        <Progress value={66} className="mt-6 h-2" />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {["Convertir", "Validar", "Guardar"].map((step) => (
            <span key={step} className="rounded-lg border bg-muted/20 px-3 py-2 text-center font-medium text-xs">
              {step}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorConversion({
  conversion,
  onRetry,
  pending,
}: {
  conversion: NonNullable<DocumentoDetail["conversion"]>;
  onRetry: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-4 p-7 text-center">
      <span className="rounded-2xl bg-destructive/10 p-4">
        <AlertTriangle className="size-9 text-destructive" />
      </span>
      <div>
        <h3 className="font-semibold text-xl">{conversion.error_codigo || "No se pudo generar el Word"}</h3>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {conversion.error_mensaje || "Revise el archivo y vuelva a intentarlo."}
        </p>
      </div>
      <Button onClick={onRetry} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Reintentar conversión
      </Button>
    </div>
  );
}

function CompletedConversion({ conversion }: { conversion: ResultadoConversion }) {
  const visualPdf = conversion.detalles_tecnicos.conversor === "pdf-imagen-alta-calidad";
  return (
    <div>
      <div className="grid gap-6 border-b bg-emerald-500/5 p-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg">
          <CheckCircle2 className="size-8" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-emerald-700 text-xs uppercase tracking-[0.2em] dark:text-emerald-300">
              Documento finalizado
            </p>
            {visualPdf ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              >
                Copia fiel al PDF
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-1 truncate font-semibold text-xl">{conversion.nombre_archivo}</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            {visualPdf
              ? "Cada página fue conservada como una imagen de alta calidad."
              : "Guardado correctamente y listo para su uso jurídico."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {conversion.archivo_url ? (
            <Button size="lg" asChild>
              <a href={conversion.archivo_url}>
                <Download /> Descargar Word
              </a>
            </Button>
          ) : null}
          {conversion.archivo_pdf_url ? (
            <Button size="lg" variant="outline" className="bg-background text-foreground" asChild>
              <a href={conversion.archivo_pdf_url}>
                <FileText /> Descargar PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <div className="p-6">
          <p className="text-muted-foreground text-xs uppercase tracking-widest">Nomenclatura jurídica completa</p>
          <p className="mt-3 rounded-xl border bg-muted/20 p-4 font-medium leading-7">
            {conversion.nomenclatura_completa}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Info icon={FolderOpen} label="Carpeta de materia" value={conversion.carpeta_materia} />
            <Info icon={FileOutput} label="Ruta final" value={conversion.ruta_relativa} />
          </div>
        </div>
        <div className="border-t bg-muted/20 p-6 lg:border-t-0 lg:border-l">
          <dl className="space-y-4">
            <Fact label="Versión" value={`v${conversion.version}`} />
            <Fact label="Tamaño" value={formatBytes(conversion.tamano_bytes)} />
            <Fact
              label="Finalizado"
              value={conversion.finalizado_at ? dateTime.format(new Date(conversion.finalizado_at)) : "-"}
            />
            <Fact
              label="Duración"
              value={conversion.duracion_ms == null ? "-" : `${(conversion.duracion_ms / 1000).toFixed(2)} s`}
            />
          </dl>
          <div className="mt-5 border-t pt-4">
            <p className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
              <Hash className="size-3.5" /> SHA-256
            </p>
            <p className="mt-2 break-all font-mono text-xs">{conversion.hash_sha256}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof FolderOpen; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border p-4">
      <span className="rounded-lg bg-indigo-500/10 p-2 text-indigo-600">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs uppercase">{label}</p>
        <p className="mt-1 break-words font-medium text-sm">{value || "-"}</p>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-right font-semibold text-sm">{value}</dd>
    </div>
  );
}
function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
