"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, FileUp, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/api/client";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import { documentoUploadSchema } from "../schemas/documentos-schemas";

function formatSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
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

  async function submit() {
    if (!file) {
      setError("Seleccione un archivo PDF.");
      return;
    }
    try {
      const created = await mutation.mutateAsync(file);
      toast.success("PDF recibido correctamente.", { description: `${created.codigo_interno} quedó pendiente de procesamiento.` });
      router.push(`/dashboard/documentos/${created.uuid}`);
    } catch (requestError) {
      toast.error("No se pudo cargar el PDF.", { description: getApiErrorMessage(requestError) });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="flex items-start gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/documentos")}><ArrowLeft /></Button>
        <div>
          <h1 className="text-3xl tracking-tight">Cargar documento normativo</h1>
          <p className="text-muted-foreground">Reciba y conserve el PDF original para su procesamiento posterior.</p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileUp className="size-5" /> Archivo PDF</CardTitle>
          <CardDescription>Archivo sin contraseña, con un tamaño máximo de 100 MB.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => select(event.target.files?.[0])} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }}
            className={`flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"}`}
          >
            <span className="rounded-full bg-background p-4 shadow-sm"><FileText className="size-8 text-primary" /></span>
            {file ? (
              <><span className="max-w-full truncate font-semibold">{file.name}</span><span className="text-muted-foreground text-sm">{formatSize(file.size)}</span></>
            ) : (
              <><span className="font-semibold">Arrastre el PDF aquí o haga clic para seleccionarlo</span><span className="text-muted-foreground text-sm">El archivo se guardará sin modificar su contenido.</span></>
            )}
          </button>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          {file ? <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}><X /> Quitar archivo</Button> : null}
        </CardContent>
      </Card>
      <Card className="bg-muted/20">
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <p className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-emerald-600" /> Validación real del PDF</p>
          <p className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-emerald-600" /> Conservación del original</p>
          <p className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-emerald-600" /> Cálculo de hash SHA-256</p>
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/dashboard/documentos")}>Cancelar</Button>
        <Button disabled={!file || mutation.isPending} onClick={() => void submit()}><FileUp /> {mutation.isPending ? "Cargando..." : "Cargar PDF"}</Button>
      </div>
    </div>
  );
}
