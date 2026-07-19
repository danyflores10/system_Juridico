"use client";

import * as React from "react";

import { ChevronLeft, ChevronRight, FileX2, Search, ShieldAlert, ZoomIn, ZoomOut } from "lucide-react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { nombreTipoNorma } from "@/data/biblioteca-catalogo";
import { buscarCoincidencias, type RangoCoincidencia } from "@/lib/texto-busqueda";
import { cn } from "@/lib/utils";

import { BarraBusquedaVisor, MINIMO_CONSULTA } from "./barra-busqueda-visor";
import { EscudoCaptura, LenteLectura, useLenteLectura, useProteccionCaptura } from "./proteccion-captura";
import type { PlanAcceso, ResultadoNormativa } from "./tipos";

interface PropiedadesVisor {
  documento: ResultadoNormativa | null;
  plan: PlanAcceso;
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
}

type EstadoVisor = "cargando" | "listo" | "error";

type ModuloPdfjs = typeof import("pdfjs-dist");

/** Fragmento de texto de una página del PDF, con su posición dentro de ella. */
interface ItemTextoPdf {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

/** Texto extraído de una página, listo para buscar y ubicar coincidencias. */
interface PaginaIndexada {
  items: ItemTextoPdf[];
  transformVista: number[];
}

/** Rectángulo de resaltado en coordenadas de la página a escala 1. */
interface RectResaltado {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Una coincidencia de la búsqueda interna: página y rectángulos a pintar. */
interface CoincidenciaPdf {
  pagina: number;
  rects: RectResaltado[];
}

/**
 * Localiza la consulta en el texto de cada página y calcula los rectángulos
 * de resaltado (a escala 1; el visor los multiplica por el zoom actual).
 * La comparación ignora mayúsculas, tildes y saltos de línea.
 */
function calcularCoincidenciasPdf(paginas: PaginaIndexada[], consulta: string, pdfjs: ModuloPdfjs): CoincidenciaPdf[] {
  const resultado: CoincidenciaPdf[] = [];

  paginas.forEach((paginaIndexada, indice) => {
    const numeroPagina = indice + 1;

    // Texto corrido de la página con el tramo que ocupa cada fragmento.
    let cadena = "";
    const tramos: { inicio: number; fin: number; item: ItemTextoPdf }[] = [];
    for (const item of paginaIndexada.items) {
      tramos.push({ inicio: cadena.length, fin: cadena.length + item.str.length, item });
      cadena += item.str + (item.hasEOL ? "\n" : "");
    }

    for (const rango of buscarCoincidencias(cadena, consulta)) {
      const rects: RectResaltado[] = [];

      for (const tramo of tramos) {
        if (tramo.fin <= rango.inicio || tramo.inicio >= rango.fin) continue;

        const longitud = tramo.item.str.length;
        if (longitud === 0 || tramo.item.width <= 0) continue;

        const desde = Math.max(0, rango.inicio - tramo.inicio) / longitud;
        const hasta = Math.min(longitud, rango.fin - tramo.inicio) / longitud;

        const transformada = pdfjs.Util.transform(paginaIndexada.transformVista, tramo.item.transform);
        const alto = Math.hypot(transformada[2], transformada[3]);
        if (alto <= 0) continue;

        rects.push({
          x: transformada[4] + desde * tramo.item.width,
          y: transformada[5] - alto,
          ancho: (hasta - desde) * tramo.item.width,
          alto,
        });
      }

      if (rects.length > 0) resultado.push({ pagina: numeroPagina, rects });
    }
  });

  return resultado;
}

/** Texto plano con las coincidencias envueltas en <mark>; la actual resalta en naranja. */
function TextoResaltado({
  texto,
  rangos,
  indiceActual,
  refActual,
}: {
  texto: string;
  rangos: RangoCoincidencia[];
  indiceActual: number;
  refActual: (nodo: HTMLElement | null) => void;
}) {
  if (rangos.length === 0) return <>{texto}</>;

  const nodos: React.ReactNode[] = [];
  let cursor = 0;

  rangos.forEach((rango, indice) => {
    if (rango.inicio > cursor) {
      nodos.push(<React.Fragment key={`texto-${cursor}`}>{texto.slice(cursor, rango.inicio)}</React.Fragment>);
    }
    const actual = indice === indiceActual;
    nodos.push(
      <mark
        key={`marca-${rango.inicio}`}
        ref={actual ? refActual : undefined}
        className={cn(
          "rounded-[2px] px-px text-foreground",
          actual
            ? "bg-orange-300 ring-2 ring-orange-400/70 dark:bg-orange-400/90 dark:text-background"
            : "bg-yellow-200 dark:bg-yellow-300/80 dark:text-background",
        )}
      >
        {texto.slice(rango.inicio, rango.fin)}
      </mark>,
    );
    cursor = rango.fin;
  });

  nodos.push(<React.Fragment key={`texto-${cursor}`}>{texto.slice(cursor)}</React.Fragment>);
  return <>{nodos}</>;
}

export function VisorDocumento({ documento, plan, abierto, onOpenChange }: PropiedadesVisor) {
  const [estado, setEstado] = React.useState<EstadoVisor>("cargando");
  const [mensajeError, setMensajeError] = React.useState("");
  const [pagina, setPagina] = React.useState(1);
  const [totalPaginas, setTotalPaginas] = React.useState(0);
  const [escala, setEscala] = React.useState(1.2);
  const [texto, setTexto] = React.useState<string | null>(null);

  // Búsqueda interna del documento (Ctrl+F).
  const [busquedaVisible, setBusquedaVisible] = React.useState(false);
  const [consulta, setConsulta] = React.useState("");
  const [indexando, setIndexando] = React.useState(false);
  const [coincidenciasPdf, setCoincidenciasPdf] = React.useState<CoincidenciaPdf[]>([]);
  const [rangosTexto, setRangosTexto] = React.useState<RangoCoincidencia[]>([]);
  const [indiceActual, setIndiceActual] = React.useState(0);

  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const pdfRef = React.useRef<PDFDocumentProxy | null>(null);
  const pdfjsRef = React.useRef<ModuloPdfjs | null>(null);
  const tareaCargaRef = React.useRef<PDFDocumentLoadingTask | null>(null);
  const tareaRenderRef = React.useRef<RenderTask | null>(null);
  const indicePdfRef = React.useRef<Promise<PaginaIndexada[]> | null>(null);
  const inputBusquedaRef = React.useRef<HTMLInputElement | null>(null);

  const busquedaVisibleRef = React.useRef(false);
  busquedaVisibleRef.current = busquedaVisible;

  const esPdf = documento?.extension === "pdf";
  const restringido = documento?.carpeta === "ACTUALIZADA";
  const totalCoincidencias = esPdf ? coincidenciasPdf.length : rangosTexto.length;

  // Protección anti-captura activa mientras el visor esté abierto.
  const { motivo, bloqueado, continuar } = useProteccionCaptura(abierto);
  const lente = useLenteLectura(abierto && estado === "listo");

  // Carga del documento al abrir el visor.
  React.useEffect(() => {
    if (!abierto || !documento) return;

    let cancelado = false;
    setEstado("cargando");
    setMensajeError("");
    setTexto(null);
    setPagina(1);
    setTotalPaginas(0);
    setBusquedaVisible(false);
    setConsulta("");
    setCoincidenciasPdf([]);
    setRangosTexto([]);
    setIndiceActual(0);
    indicePdfRef.current = null;

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
          pdfjsRef.current = pdfjs;
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
      indicePdfRef.current = null;
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

  /** Extrae (una sola vez por documento) el texto de todas las páginas del PDF. */
  const obtenerIndicePdf = React.useCallback((): Promise<PaginaIndexada[]> => {
    const documentoPdf = pdfRef.current;
    if (!documentoPdf) return Promise.resolve([]);

    indicePdfRef.current ??= (async () => {
      const paginas: PaginaIndexada[] = [];
      for (let numero = 1; numero <= documentoPdf.numPages; numero++) {
        const paginaPdf = await documentoPdf.getPage(numero);
        const contenido = await paginaPdf.getTextContent();
        paginas.push({
          items: contenido.items.filter((item) => "str" in item) as unknown as ItemTextoPdf[],
          transformVista: paginaPdf.getViewport({ scale: 1 }).transform,
        });
      }
      return paginas;
    })();

    return indicePdfRef.current;
  }, []);

  // Ejecuta la búsqueda interna (con una pequeña espera mientras se escribe).
  React.useEffect(() => {
    const termino = consulta.trim();
    if (!busquedaVisible || estado !== "listo" || termino.length < MINIMO_CONSULTA) {
      setCoincidenciasPdf([]);
      setRangosTexto([]);
      setIndiceActual(0);
      setIndexando(false);
      return;
    }

    let cancelado = false;
    const temporizador = window.setTimeout(async () => {
      if (esPdf) {
        setIndexando(true);
        try {
          const paginas = await obtenerIndicePdf();
          const pdfjs = pdfjsRef.current;
          if (cancelado || !pdfjs) return;

          const encontradas = calcularCoincidenciasPdf(paginas, termino, pdfjs);
          setCoincidenciasPdf(encontradas);
          setIndiceActual(0);
          if (encontradas.length > 0) setPagina(encontradas[0].pagina);
        } catch {
          if (!cancelado) setCoincidenciasPdf([]);
        } finally {
          if (!cancelado) setIndexando(false);
        }
      } else if (texto !== null) {
        setRangosTexto(buscarCoincidencias(texto, termino));
        setIndiceActual(0);
      }
    }, 220);

    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
    };
  }, [busquedaVisible, consulta, estado, esPdf, texto, obtenerIndicePdf]);

  // Atajos de teclado: Ctrl+F abre la búsqueda, Esc la cierra sin cerrar el visor.
  React.useEffect(() => {
    if (!abierto) return;

    function manejarTeclado(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "f") {
        evento.preventDefault();
        setBusquedaVisible(true);
        window.setTimeout(() => inputBusquedaRef.current?.select(), 0);
        return;
      }
      if (evento.key === "Escape" && busquedaVisibleRef.current) {
        evento.preventDefault();
        evento.stopPropagation();
        setBusquedaVisible(false);
      }
    }

    window.addEventListener("keydown", manejarTeclado, true);
    return () => window.removeEventListener("keydown", manejarTeclado, true);
  }, [abierto]);

  const irACoincidencia = React.useCallback(
    (indice: number) => {
      if (totalCoincidencias === 0) return;
      const normalizado = ((indice % totalCoincidencias) + totalCoincidencias) % totalCoincidencias;
      setIndiceActual(normalizado);
      if (esPdf) setPagina(coincidenciasPdf[normalizado].pagina);
    },
    [totalCoincidencias, esPdf, coincidenciasPdf],
  );

  /** Al montarse el resaltado de la coincidencia actual, se desplaza hasta él. */
  const marcarRefActual = React.useCallback((nodo: HTMLElement | null) => {
    nodo?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, []);

  function abrirBusqueda() {
    setBusquedaVisible(true);
    window.setTimeout(() => inputBusquedaRef.current?.select(), 0);
  }

  // Rectángulos a pintar sobre la página visible del PDF.
  const resaltadosPagina = React.useMemo(() => {
    if (!busquedaVisible || !esPdf) return [];

    const lista: { clave: string; rect: RectResaltado; actual: boolean; primero: boolean }[] = [];
    coincidenciasPdf.forEach((coincidencia, indice) => {
      if (coincidencia.pagina !== pagina) return;
      coincidencia.rects.forEach((rect, posicion) => {
        lista.push({
          clave: `${indice}-${posicion}`,
          rect,
          actual: indice === indiceActual,
          primero: posicion === 0,
        });
      });
    });
    return lista;
  }, [busquedaVisible, esPdf, coincidenciasPdf, pagina, indiceActual]);

  /**
   * Copia, arrastre y menú contextual vetados en todo documento del visor:
   * "Guardar imagen como…" o Ctrl+C copiarían el contenido renderizado.
   */
  function bloquearCopia(evento: React.SyntheticEvent) {
    evento.preventDefault();
  }

  if (!documento) return null;

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] flex-col gap-0 p-0 sm:max-w-6xl print:hidden">
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
            <Button
              variant="outline"
              size="sm"
              disabled={estado !== "listo"}
              onClick={abrirBusqueda}
              title="Buscar en el documento (Ctrl+F)"
            >
              <Search className="size-3.5" />
              Buscar
            </Button>
          </div>
        </div>

        {restringido ? (
          <div className="flex items-center gap-2 border-amber-200 border-b bg-amber-50 px-6 py-2 text-amber-800 text-xs dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <ShieldAlert className="size-3.5 shrink-0" />
            Normativa actualizada: documento de solo lectura con restricción de copia de texto.
          </div>
        ) : null}

        <div className="relative min-h-0 flex-1">
          {busquedaVisible ? (
            <BarraBusquedaVisor
              consulta={consulta}
              onConsultaChange={setConsulta}
              total={totalCoincidencias}
              indiceActual={indiceActual}
              indexando={indexando}
              onAnterior={() => irACoincidencia(indiceActual - 1)}
              onSiguiente={() => irACoincidencia(indiceActual + 1)}
              onCerrar={() => setBusquedaVisible(false)}
              inputRef={inputBusquedaRef}
              className="absolute inset-x-3 top-3 z-25 sm:inset-x-auto sm:right-6 sm:w-96"
            />
          ) : null}

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

          {estado === "listo" ? <LenteLectura lenteRef={lente.lenteRef} /> : null}

          {estado === "listo" && !lente.dentro && !bloqueado ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center">
              <span className="rounded-full border bg-background/90 px-4 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
                Vista protegida: mueva el cursor sobre el documento para leer
              </span>
            </div>
          ) : null}

          <EscudoCaptura motivo={motivo} onContinuar={continuar} />

          {/* biome-ignore lint/a11y/noStaticElementInteractions: bloqueo de copia/menú contextual exigido por el módulo para proteger los documentos */}
          <div
            className={cn("h-full select-none overflow-auto bg-muted/40 p-6", bloqueado && "blur-2xl")}
            onContextMenu={bloquearCopia}
            onCopy={bloquearCopia}
            onDragStart={bloquearCopia}
            onPointerMove={lente.alMoverPuntero}
            onPointerDown={lente.alMoverPuntero}
            onPointerLeave={lente.alSalirPuntero}
          >
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
                <div className="relative">
                  <canvas ref={canvasRef} className="rounded-sm shadow-lg ring-1 ring-border" />
                  {resaltadosPagina.length > 0 ? (
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                      {resaltadosPagina.map((resaltado) => (
                        <div
                          key={resaltado.clave}
                          ref={resaltado.actual && resaltado.primero ? marcarRefActual : undefined}
                          className={cn(
                            "absolute rounded-[2px] mix-blend-multiply",
                            resaltado.actual ? "bg-orange-300 ring-2 ring-orange-500/70" : "bg-yellow-200",
                          )}
                          style={{
                            left: resaltado.rect.x * escala - 1,
                            top: resaltado.rect.y * escala - 1,
                            width: resaltado.rect.ancho * escala + 2,
                            height: resaltado.rect.alto * escala + 2,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {estado === "listo" && !esPdf && texto !== null ? (
              <div className="mx-auto max-w-3xl rounded-sm bg-background p-8 shadow-lg ring-1 ring-border">
                <h3 className="mb-4 font-semibold text-lg leading-snug">{documento.titulo}</h3>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {busquedaVisible && rangosTexto.length > 0 ? (
                    <TextoResaltado
                      texto={texto}
                      rangos={rangosTexto}
                      indiceActual={indiceActual}
                      refActual={marcarRefActual}
                    />
                  ) : (
                    texto
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
