"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  FileOutput,
  FileText,
  FileUp,
  Scale,
  ScanSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import { documentoUploadSchema } from "../schemas/documentos-schemas";

const GARANTIAS = [
  {
    titulo: "Validación real del PDF",
    detalle: "Se verifica la estructura interna del archivo, no solo la extensión.",
  },
  {
    titulo: "Conservación del original",
    detalle: "El PDF recibido se guarda intacto, sin modificar su contenido.",
  },
  {
    titulo: "Cálculo de hash SHA-256",
    detalle: "Huella digital única para garantizar la integridad del documento.",
  },
];

const PASOS_SIGUIENTES = [
  {
    titulo: "Procesamiento y OCR",
    detalle: "El texto se vuelve legible y buscable.",
    icon: ScanSearch,
  },
  {
    titulo: "Extracción de la ficha jurídica",
    detalle: "Tipo de norma, número, fecha, materia y objeto.",
    icon: BookOpenText,
  },
  {
    titulo: "Revisión y control de calidad",
    detalle: "Se validan los datos propuestos antes de aprobar.",
    icon: Scale,
  },
  {
    titulo: "Word y PDF finales",
    detalle: "Con la nomenclatura oficial, guardados por materia.",
    icon: FileOutput,
  },
];

function formatSize(size: number) {
  return size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentoForm() {
  const router = useRouter();
  const mutation = useDocumentoMutations().upload;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState("");
  const [dragging, setDragging] = React.useState(false);

  function select(candidate?: File) {
    const result = documentoUploadSchema.safeParse(candidate);
    if (!result.success) {
      setFile(null);
      setError(result.error.issues[0]?.message ?? "Archivo no válido.");
      return;
    }
    setFile(result.data);
    setError("");
  }

  function clearFile() {
    setFile(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!file) {
      setError("Seleccione un archivo PDF.");
      return;
    }
    try {
      const created = await mutation.mutateAsync(file);
      toast.success("PDF recibido correctamente.", {
        description: `${created.codigo_interno} quedó pendiente de procesamiento.`,
      });
      router.push(`/dashboard/documentos/${created.uuid}`);
    } catch (requestError) {
      toast.error("No se pudo cargar el PDF.", { description: getApiErrorMessage(requestError) });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm md:p-8">
        <FileUp className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
              <FileUp className="size-3.5" /> Módulo 1 · Cargador jurídico
            </span>
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Cargar documento normativo</h1>
            <p className="max-w-2xl text-primary-foreground/80 text-sm">
              Reciba el PDF original y consérvelo sin alteraciones. Desde aquí comienza el flujo completo: OCR, ficha
              jurídica, revisión y archivo final por materia.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => router.push("/dashboard/documentos")}>
              <ArrowLeft className="size-4" /> Volver a documentos
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        {/* Recepción del archivo */}
        <Card className="gap-0 rounded-none py-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <FileUp className="size-4 text-primary" /> Archivo PDF
              </p>
              <p className="text-muted-foreground text-sm">Archivo sin contraseña, con un tamaño máximo de 100 MB.</p>
            </div>
            <Badge variant="outline" className="rounded-none">
              Solo PDF
            </Badge>
          </div>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => select(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                select(event.dataTransfer.files[0]);
              }}
              className={cn(
                "flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-none border-2 border-dashed p-8 text-center transition-colors",
                dragging && "border-primary bg-primary/5",
                !dragging && file && "border-emerald-500/50 bg-emerald-500/5",
                !dragging && !file && "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              {file ? (
                <>
                  <span className="grid size-16 place-items-center rounded-none bg-emerald-500/10">
                    <CheckCircle2 className="size-8 text-emerald-600" />
                  </span>
                  <span className="max-w-full truncate font-semibold">{file.name}</span>
                  <span className="text-muted-foreground text-sm">{formatSize(file.size)} · Listo para cargar</span>
                  <span className="text-muted-foreground text-xs">Haga clic para reemplazarlo por otro archivo.</span>
                </>
              ) : (
                <>
                  <span className="grid size-16 place-items-center rounded-none bg-background shadow-sm">
                    <FileText className="size-8 text-primary" />
                  </span>
                  <span className="font-semibold">Arrastre el PDF aquí o haga clic para seleccionarlo</span>
                  <span className="text-muted-foreground text-sm">
                    El archivo se guardará sin modificar su contenido.
                  </span>
                </>
              )}
            </button>
            {error ? (
              <p className="border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">{error}</p>
            ) : null}
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 p-4">
            {file ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearFile}>
                <X /> Quitar archivo
              </Button>
            ) : (
              <p className="text-muted-foreground text-sm">Seleccione un PDF para habilitar la carga.</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/dashboard/documentos")}>
                Cancelar
              </Button>
              <Button disabled={!file || mutation.isPending} onClick={() => void submit()}>
                <FileUp className={cn(mutation.isPending && "animate-pulse")} />
                {mutation.isPending ? "Cargando…" : "Cargar PDF"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Panel informativo */}
        <div className="flex flex-col gap-4">
          <Card className="gap-0 rounded-none py-0">
            <div className="border-b p-4">
              <p className="flex items-center gap-2 font-medium">
                <ShieldCheck className="size-4 text-emerald-600" /> Garantías de recepción
              </p>
              <p className="text-muted-foreground text-sm">Controles aplicados al recibir el archivo.</p>
            </div>
            <CardContent className="space-y-4 p-4">
              {GARANTIAS.map((garantia) => (
                <div key={garantia.titulo} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-none bg-emerald-500/10">
                    <ShieldCheck className="size-4 text-emerald-600" />
                  </span>
                  <div>
                    <p className="font-medium text-sm">{garantia.titulo}</p>
                    <p className="text-muted-foreground text-xs leading-5">{garantia.detalle}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-none py-0">
            <div className="border-b p-4">
              <p className="font-medium">¿Qué sigue después de la carga?</p>
              <p className="text-muted-foreground text-sm">El documento avanza por estas etapas.</p>
            </div>
            <CardContent className="space-y-4 p-4">
              {PASOS_SIGUIENTES.map((paso, index) => {
                const Icon = paso.icon;
                return (
                  <div key={paso.titulo} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-none bg-primary/10 font-semibold text-primary text-xs">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium text-sm">
                        <Icon className="size-3.5 text-primary" /> {paso.titulo}
                      </p>
                      <p className="text-muted-foreground text-xs leading-5">{paso.detalle}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
