"use client";

import * as React from "react";

import { CircleAlert, CircleCheck, CloudUpload, FileText, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { analizarNomenclatura, CARPETAS, type Carpeta, nombreTipoNorma } from "@/data/biblioteca-catalogo";
import { cn } from "@/lib/utils";

interface PropiedadesCarga {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  onCargado: () => void;
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DialogoCarga({ abierto, onOpenChange, onCargado }: PropiedadesCarga) {
  const [carpeta, setCarpeta] = React.useState<Carpeta>("EMITIDA");
  const [archivo, setArchivo] = React.useState<File | null>(null);
  const [arrastrando, setArrastrando] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);
  const entradaRef = React.useRef<HTMLInputElement | null>(null);

  const analisis = archivo ? analizarNomenclatura(archivo.name) : null;

  function reiniciar() {
    setArchivo(null);
    setCarpeta("EMITIDA");
    setArrastrando(false);
    if (entradaRef.current) entradaRef.current.value = "";
  }

  function cerrar(estadoAbierto: boolean) {
    if (!estadoAbierto) reiniciar();
    onOpenChange(estadoAbierto);
  }

  async function subir() {
    if (!archivo || !analisis?.ok) return;

    setEnviando(true);
    try {
      const formulario = new FormData();
      formulario.append("archivo", archivo);
      formulario.append("carpeta", carpeta);

      const respuesta = await fetch("/api/biblioteca/documentos", { method: "POST", body: formulario });
      const datos: { error?: string; detalles?: string[]; mensaje?: string } = await respuesta.json();

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible subir el documento.", {
          description: datos.detalles?.join(" "),
        });
        return;
      }

      toast.success("Documento incorporado a la biblioteca.");
      cerrar(false);
      onCargado();
    } catch {
      toast.error("No fue posible comunicarse con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  const camposVistaPrevia =
    analisis?.ok && analisis.datos !== null
      ? [
          { etiqueta: "Efecto", valor: analisis.datos.efecto },
          {
            etiqueta: "Tipo de norma",
            valor: `${analisis.datos.tipoNorma} — ${nombreTipoNorma(analisis.datos.tipoNorma)}`,
          },
          { etiqueta: "Número", valor: analisis.datos.numero },
          { etiqueta: "Promulgación", valor: analisis.datos.fechaPromulgacion.split("-").reverse().join("/") },
          { etiqueta: "Título", valor: analisis.datos.titulo },
          { etiqueta: "Objeto (resumido)", valor: analisis.datos.objetoResumido },
          { etiqueta: "Materia", valor: analisis.datos.materia },
        ]
      : [];

  return (
    <Dialog open={abierto} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agregar a la biblioteca</DialogTitle>
          <DialogDescription>
            El nombre del archivo debe cumplir la nomenclatura oficial; de él se obtienen los criterios de búsqueda.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <p className="font-medium text-muted-foreground text-xs">Nomenclatura</p>
            <code className="text-xs leading-snug">
              Efecto; TipoNorma; Número; Fecha; Título; Objeto(Resumido); Materia.pdf
            </code>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="carpeta-destino">Carpeta de destino</Label>
            <Select value={carpeta} onValueChange={(valor) => setCarpeta(valor as Carpeta)}>
              <SelectTrigger id="carpeta-destino" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CARPETAS.map((opcion) => (
                    <SelectItem key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {archivo === null ? (
            /* biome-ignore lint/a11y/noStaticElementInteractions: la zona delega en el input de archivo */
            <div
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
                arrastrando ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              )}
              onClick={() => entradaRef.current?.click()}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") entradaRef.current?.click();
              }}
              onDragOver={(evento) => {
                evento.preventDefault();
                setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={(evento) => {
                evento.preventDefault();
                setArrastrando(false);
                const soltado = evento.dataTransfer.files.item(0);
                if (soltado) setArchivo(soltado);
              }}
            >
              <CloudUpload className="size-8 text-muted-foreground" />
              <p className="font-medium text-sm">Arrastre el archivo aquí o haga clic para seleccionarlo</p>
              <p className="text-muted-foreground text-xs">PDF, DOCX o TXT — máximo 25 MB</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/50">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all font-medium text-sm leading-snug">{archivo.name}</p>
                  <p className="text-muted-foreground text-xs">{formatearTamano(archivo.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  aria-label="Quitar archivo"
                  onClick={() => {
                    setArchivo(null);
                    if (entradaRef.current) entradaRef.current.value = "";
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {analisis?.ok ? (
                <div className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 text-xs dark:text-emerald-300">
                      Nomenclatura válida
                    </span>
                  </div>
                  {camposVistaPrevia.map((campo) => (
                    <div key={campo.etiqueta} className="grid grid-cols-[110px_1fr] gap-2 text-xs">
                      <span className="text-muted-foreground">{campo.etiqueta}</span>
                      <span className="leading-snug">{campo.valor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <CircleAlert className="size-3.5 text-destructive" />
                    <span className="font-medium text-destructive text-xs">Nomenclatura inválida</span>
                  </div>
                  {analisis?.errores.map((error) => (
                    <p key={error} className="text-muted-foreground text-xs leading-snug">
                      • {error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          <input
            ref={entradaRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(evento) => {
              const seleccionado = evento.target.files?.item(0);
              if (seleccionado) setArchivo(seleccionado);
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={enviando} onClick={() => cerrar(false)}>
            Cancelar
          </Button>
          <Button disabled={!analisis?.ok || enviando} onClick={() => void subir()}>
            {enviando ? <Spinner className="size-4" /> : <CloudUpload className="size-4" />}
            Subir a {carpeta === "EMITIDA" ? "Normativa emitida" : "Normativa actualizada"}
          </Button>
        </DialogFooter>

        {carpeta === "ACTUALIZADA" ? (
          <Badge variant="outline" className="justify-center gap-1.5 font-normal text-muted-foreground text-xs">
            Los documentos de esta carpeta quedarán disponibles solo para la suscripción.
          </Badge>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
