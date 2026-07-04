"use client";

import * as React from "react";

import { ChevronLeft, ChevronRight, Download, FileX2, ImageDown, ShieldAlert, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { nombreTipoNorma } from "@/data/biblioteca-catalogo";
import { cn } from "@/lib/utils";

import { canvasDesdeTexto, componerCaptura, descargarCanvas } from "./marca-agua";
import type { PlanAcceso, ResultadoNormativa } from "./tipos";

interface PropiedadesVisor {
  documento: ResultadoNormativa | null;
  plan: PlanAcceso;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
}

type EstadoVisor = "cargando" | "listo" | "error";

export function VisorDocumento({ documento, plan, abierto, onOpenChange }: PropiedadesVisor) {
  const [estado, setEstado] = React.useState<EstadoVisor>("cargando");
  const [mensajeError, setMensajeError] = React.useState("");
  const [pagina, setPagina] = React.useState(1);
  const [totalPaginas, setTotalPaginas] = React.useState(0);
  const [escala, setEscala] = React.useState(1.2);
  const [texto, setTexto] = React.useState<string | null>(null);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const pdfRef = React.useRef<PDFDocumentProxy | null>(null);
  const tareaCargaRef = React.useRef<PDFDocumentLoadingTask | null>(null);
  const tareaRenderRef = React.useRef<RenderTask | null>(null);

  const esPdf = documento?.extension === "pdf";
  const restringido = documento?.carpeta === "ACTUALIZADA";

  // Carga del documento al abrir el visor.
  React.useEffect(() => {
    if (!abierto || !documento) return;

    let cancelado = false;
    setEstado("cargando");
    setMensajeError("");
    setTexto(null);
    setPagina(1);
    setTotalPaginas(0);

    async function cargar() {
      if (!documento) return;

      try {
        if (documento.extension === "pdf") {
          const respuesta = await fetch(`/api/biblioteca/documentos/${documento.id}/archivo?plan=${plan}`);
          if (!respuesta.ok) {
            const datos: { error?: string } | null = await respuesta.json().catch(() => null);
            throw new Error(datos?.error ?? "No fue posible obtener el documento.");
          }

          const binario = await respuesta.arrayBuffer();
          const pdfjs = await import("pdfjs-dist");
          // El worker se sirve desde /public (copiado desde pdfjs-dist/build).
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

          const tareaCarga = pdfjs.getDocument({ data: binario });
          tareaCargaRef.current = tareaCarga;

          const cargado = await tareaCarga.promise;
          if (cancelado) {
            void tareaCarga.destroy();
            return;
          }

          pdfRef.current = cargado;
          setTotalPaginas(cargado.numPages);
          setEstado("listo");
        } else {
          const respuesta = await fetch(`/api/biblioteca/documentos/${documento.id}/texto?plan=${plan}`);
          const datos: { texto?: string; error?: string } = await respuesta.json();
          if (!respuesta.ok) throw new Error(datos.error ?? "No fue posible obtener el documento.");
          if (cancelado) return;

          setTexto(datos.texto ?? "");
          setEstado("listo");
        }
      } catch (error) {
        if (!cancelado) {
          setMensajeError(error instanceof Error ? error.message : "Error inesperado al abrir el documento.");
          setEstado("error");
        }
      }
    }

    void cargar();

    return () => {
      cancelado = true;
      tareaRenderRef.current?.cancel();
      tareaRenderRef.current = null;
      pdfRef.current = null;
      if (tareaCargaRef.current) {
        void tareaCargaRef.current.destroy();
        tareaCargaRef.current = null;
      }
    };
  }, [abierto, documento, plan]);

  // Dibuja la página actual del PDF en el lienzo.
  React.useEffect(() => {
    if (estado !== "listo" || !esPdf) return;

    const documentoPdf = pdfRef.current;
    const lienzo = canvasRef.current;
    if (!documentoPdf || !lienzo) return;

    let cancelado = false;

    async function dibujar() {
      if (!documentoPdf || !lienzo) return;

      try {
        const paginaPdf = await documentoPdf.getPage(pagina);
        if (cancelado) return;

        const densidad = Math.min(window.devicePixelRatio || 1, 2);
        const vista = paginaPdf.getViewport({ scale: escala });

        lienzo.width = Math.floor(vista.width * densidad);
        lienzo.height = Math.floor(vista.height * densidad);
        lienzo.style.width = `${Math.floor(vista.width)}px`;
        lienzo.style.height = `${Math.floor(vista.height)}px`;

        tareaRenderRef.current?.cancel();
        const tarea = paginaPdf.render({
          canvas: lienzo,
          viewport: vista,
          transform: densidad !== 1 ? [densidad, 0, 0, densidad, 0, 0] : undefined,
        });
        tareaRenderRef.current = tarea;
        await tarea.promise;
      } catch (error) {
        const nombre = (error as { name?: string }).name;
        if (nombre !== "RenderingCancelledException" && !cancelado) {
          console.error("Error al dibujar la página del PDF:", error);
        }
      }
    }

    void dibujar();

    return () => {
      cancelado = true;
    };
  }, [estado, esPdf, pagina, escala]);

  function capturarPantalla() {
    if (!documento) return;

    let origen: HTMLCanvasElement | null = null;
    if (esPdf) {
      origen = canvasRef.current;
    } else if (texto !== null) {
      origen = canvasDesdeTexto(texto, documento.titulo);
    }

    if (!origen) {
      toast.error("No hay contenido para capturar.");
      return;
    }

    const captura = componerCaptura(origen);
    descargarCanvas(captura, `Captura - ${documento.titulo}.png`);
    toast.success("Captura generada", {
      description: "La imagen incluye el logo de la empresa como fondo de protección.",
    });
  }

  function descargarOriginal() {
    if (documento?.carpeta !== "EMITIDA") return;
    const enlace = document.createElement("a");
    enlace.href = `/api/biblioteca/documentos/${documento.id}/archivo?plan=${plan}&descarga=1`;
    enlace.download = documento.nombreArchivo;
    enlace.click();
  }

  function bloquearCopia(evento: React.SyntheticEvent) {
    if (restringido) evento.preventDefault();
  }

  if (!documento) return null;

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-0 p-0 sm:max-w-6xl">
        <DialogHeader className="gap-2 border-b px-6 py-4">
          <DialogTitle className="pr-8 text-base leading-snug">{documento.titulo}</DialogTitle>
          <DialogDescription className="sr-only">Visor del documento {documento.nombreArchivo}</DialogDescription>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              {documento.tipoNorma}
            </Badge>
            <Badge variant="secondary" className="font-normal text-[10px]">
              {nombreTipoNorma(documento.tipoNorma)} {documento.numero}
            </Badge>
            <Badge variant="secondary" className="font-normal text-[10px]">
              {documento.materia}
            </Badge>
            {restringido ? (
              <Badge
                variant="outline"
                className="gap-1 border-amber-300 bg-amber-50 font-normal text-[10px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <ShieldAlert className="size-3" />
                Copia restringida
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-6 py-2">
          <div className="flex items-center gap-1">
            {esPdf ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={pagina <= 1 || estado !== "listo"}
                  onClick={() => setPagina((actual) => actual - 1)}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="min-w-16 text-center text-muted-foreground text-sm tabular-nums">
                  {totalPaginas > 0 ? `${pagina} / ${totalPaginas}` : "—"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={pagina >= totalPaginas || estado !== "listo"}
                  onClick={() => setPagina((actual) => actual + 1)}
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="size-4" />
                </Button>

                <Separator orientation="vertical" className="mx-2 h-5" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={escala <= 0.7 || estado !== "listo"}
                  onClick={() => setEscala((actual) => Math.max(0.6, Number((actual - 0.2).toFixed(1))))}
                  aria-label="Reducir"
                >
                  <ZoomOut className="size-4" />
                </Button>
                <span className="min-w-12 text-center text-muted-foreground text-sm tabular-nums">
                  {Math.round(escala * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={escala >= 2.4 || estado !== "listo"}
                  onClick={() => setEscala((actual) => Math.min(2.4, Number((actual + 0.2).toFixed(1))))}
                  aria-label="Ampliar"
                >
                  <ZoomIn className="size-4" />
                </Button>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Vista de texto del documento</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={estado !== "listo"} onClick={capturarPantalla}>
              <ImageDown className="size-3.5" />
              Capturar imagen
            </Button>
            {documento.carpeta === "EMITIDA" ? (
              <Button variant="outline" size="sm" onClick={descargarOriginal}>
                <Download className="size-3.5" />
                Descargar
              </Button>
            ) : null}
          </div>
        </div>

        {restringido ? (
          <div className="flex items-center gap-2 border-amber-200 border-b bg-amber-50 px-6 py-2 text-amber-800 text-xs dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldAlert className="size-3.5 shrink-0" />
            Normativa actualizada: documento de solo lectura con restricción de copia de texto.
          </div>
        ) : null}

        {/* biome-ignore lint/a11y/noStaticElementInteractions: bloqueo de copia/menú contextual exigido por el módulo para la normativa actualizada */}
        <div
          className={cn("relative flex-1 overflow-auto bg-muted/40 p-6", restringido && "select-none")}
          onContextMenu={bloquearCopia}
          onCopy={bloquearCopia}
        >
          {restringido ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-around overflow-hidden"
            >
              {["marca-1", "marca-2", "marca-3"].map((marca) => (
                <span
                  key={marca}
                  className="-rotate-[24deg] whitespace-nowrap font-black text-6xl text-foreground/[0.05] tracking-[0.35em]"
                >
                  CONSULTOR JURÍDICO
                </span>
              ))}
            </div>
          ) : null}

          {estado === "cargando" ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Spinner className="size-6" />
                <span className="text-sm">Cargando documento…</span>
              </div>
            </div>
          ) : null}

          {estado === "error" ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                <FileX2 className="size-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">{mensajeError}</p>
              </div>
            </div>
          ) : null}

          {estado === "listo" && esPdf ? (
            <div className="flex min-h-full items-start justify-center">
              <canvas ref={canvasRef} className="rounded-sm shadow-lg ring-1 ring-border" />
            </div>
          ) : null}

          {estado === "listo" && !esPdf && texto !== null ? (
            <div className="mx-auto max-w-3xl rounded-sm bg-background p-8 shadow-lg ring-1 ring-border">
              <h3 className="mb-4 font-semibold text-lg leading-snug">{documento.titulo}</h3>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{texto}</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
