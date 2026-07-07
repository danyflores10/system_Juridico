"use client";

import * as React from "react";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Eye, Lock, MoreHorizontal, SearchX, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { nombreTipoNorma } from "@/data/biblioteca-catalogo";
import { cn } from "@/lib/utils";

import { estaBloqueado, type PlanAcceso, type ResultadoNormativa } from "./tipos";

interface PropiedadesTabla {
  resultados: ResultadoNormativa[];
  buscando: boolean;
  plan: PlanAcceso;
  onVer: (documento: ResultadoNormativa) => void;
  onEliminado: () => void;
}

/** Convierte los marcadores [[[ ]]] de ts_headline en resaltado visual seguro. */
function Coincidencia({ texto }: { texto: string }) {
  const nodos: { clave: string; contenido: string; resaltado: boolean }[] = [];
  const patron = /\[\[\[(.*?)\]\]\]/g;
  let cursor = 0;

  for (let coincidencia = patron.exec(texto); coincidencia !== null; coincidencia = patron.exec(texto)) {
    if (coincidencia.index > cursor) {
      nodos.push({ clave: `texto-${cursor}`, contenido: texto.slice(cursor, coincidencia.index), resaltado: false });
    }
    nodos.push({ clave: `marca-${coincidencia.index}`, contenido: coincidencia[1], resaltado: true });
    cursor = coincidencia.index + coincidencia[0].length;
  }
  if (cursor < texto.length) {
    nodos.push({ clave: `texto-${cursor}`, contenido: texto.slice(cursor), resaltado: false });
  }

  return (
    <span className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
      {nodos.map((nodo) =>
        nodo.resaltado ? (
          <mark key={nodo.clave} className="rounded-xs bg-primary/20 px-0.5 font-medium text-foreground">
            {nodo.contenido}
          </mark>
        ) : (
          <React.Fragment key={nodo.clave}>{nodo.contenido}</React.Fragment>
        ),
      )}
    </span>
  );
}

function InsigniaCarpeta({ documento, plan }: { documento: ResultadoNormativa; plan: PlanAcceso }) {
  if (documento.carpeta === "EMITIDA") {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      >
        <span className="size-1.5 rounded-full bg-emerald-500" />
        Emitida
      </Badge>
    );
  }

  const bloqueada = plan !== "suscripcion";

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      {bloqueada ? <Lock className="size-3" /> : <span className="size-1.5 rounded-full bg-amber-500" />}
      Actualizada
    </Badge>
  );
}

function formatearFecha(fechaIso: string): string {
  return format(new Date(`${fechaIso}T00:00:00`), "dd/MM/yyyy");
}

function FilasEsqueleto() {
  const filas = ["a", "b", "c", "d", "e"];
  return (
    <>
      {filas.map((fila) => (
        <TableRow key={fila}>
          <TableCell className="px-4 py-4">
            <Skeleton className="h-5 w-12" />
          </TableCell>
          <TableCell className="px-4">
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell className="px-4">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="px-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-80" />
            </div>
          </TableCell>
          <TableCell className="px-4">
            <Skeleton className="h-5 w-28" />
          </TableCell>
          <TableCell className="px-4">
            <Skeleton className="h-5 w-24" />
          </TableCell>
          <TableCell className="px-4">
            <Skeleton className="ml-auto h-8 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function TablaResultados({ resultados, buscando, plan, onVer, onEliminado }: PropiedadesTabla) {
  const [pagina, setPagina] = React.useState(0);
  const [porPagina, setPorPagina] = React.useState(10);
  const [aEliminar, setAEliminar] = React.useState<ResultadoNormativa | null>(null);
  const [eliminando, setEliminando] = React.useState(false);

  // Al llegar una lista nueva de resultados se vuelve a la primera página.
  const [listaPrevia, setListaPrevia] = React.useState(resultados);
  if (listaPrevia !== resultados) {
    setListaPrevia(resultados);
    setPagina(0);
  }

  const totalPaginas = Math.max(Math.ceil(resultados.length / porPagina), 1);
  const paginaActual = Math.min(pagina, totalPaginas - 1);
  const visibles = resultados.slice(paginaActual * porPagina, (paginaActual + 1) * porPagina);

  function intentarVer(documento: ResultadoNormativa) {
    if (estaBloqueado(documento, plan)) {
      toast.warning("Documento exclusivo de la suscripción", {
        description: "La normativa actualizada solo puede visualizarse con la opción de suscripción.",
      });
      return;
    }
    onVer(documento);
  }

  function descargar(documento: ResultadoNormativa) {
    if (documento.carpeta === "ACTUALIZADA") {
      toast.warning("Este documento tiene restricción de copia y no puede descargarse.");
      return;
    }
    const enlace = document.createElement("a");
    enlace.href = `/api/biblioteca/documentos/${documento.id}/archivo?plan=${plan}&descarga=1`;
    enlace.download = documento.nombreArchivo;
    enlace.click();
  }

  async function confirmarEliminacion() {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      const respuesta = await fetch(`/api/biblioteca/documentos/${aEliminar.id}`, { method: "DELETE" });
      const datos: { error?: string; mensaje?: string } = await respuesta.json();

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible eliminar el documento.");
        return;
      }

      toast.success("Documento eliminado de la biblioteca.");
      onEliminado();
    } catch {
      toast.error("No fue posible comunicarse con el servidor.");
    } finally {
      setEliminando(false);
      setAEliminar(null);
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base leading-none">
          Resultados
          <Badge variant="secondary" className="tabular-nums">
            {resultados.length}
          </Badge>
        </CardTitle>
        <CardDescription className="leading-snug">
          Documentos de la biblioteca que cumplen los criterios seleccionados.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
          <TableHeader>
            <TableRow>
              <TableHead className="py-3 font-normal">Tipo</TableHead>
              <TableHead className="py-3 font-normal">Número</TableHead>
              <TableHead className="py-3 font-normal">Promulgación</TableHead>
              <TableHead className="w-full py-3 font-normal">Documento</TableHead>
              <TableHead className="py-3 font-normal">Materia</TableHead>
              <TableHead className="py-3 font-normal">Carpeta</TableHead>
              <TableHead className="py-3 text-right font-normal">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {buscando ? <FilasEsqueleto /> : null}
            {!buscando && visibles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchX />
                      </EmptyMedia>
                      <EmptyTitle>Sin resultados</EmptyTitle>
                      <EmptyDescription>
                        Ningún documento de la biblioteca cumple los criterios. Ajuste los filtros e intente nuevamente.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            ) : null}
            {!buscando &&
              visibles.map((documento) => {
                const bloqueado = estaBloqueado(documento, plan);

                return (
                  <TableRow key={documento.id} className={cn("border-border/60", bloqueado && "opacity-75")}>
                    <TableCell className="py-4 align-top">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {documento.tipoNorma}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>{nombreTipoNorma(documento.tipoNorma)}</TooltipContent>
                      </Tooltip>
                    </TableCell>

                    <TableCell className="py-4 align-top">
                      <div className="grid gap-0.5">
                        <span className="whitespace-nowrap font-medium tabular-nums">{documento.numero}</span>
                        <span className="text-muted-foreground text-xs">Efecto: {documento.efecto}</span>
                      </div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap py-4 align-top tabular-nums">
                      {formatearFecha(documento.fechaPromulgacion)}
                    </TableCell>

                    <TableCell className="min-w-72 py-4 align-top">
                      <div className="grid gap-1">
                        <span className="font-medium leading-snug">{documento.titulo}</span>
                        {documento.coincidencia?.includes("[[[") ? (
                          <Coincidencia texto={documento.coincidencia} />
                        ) : (
                          <span className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                            {documento.objetoResumido}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4 align-top">
                      <Badge variant="secondary" className="whitespace-nowrap font-normal">
                        {documento.materia}
                      </Badge>
                    </TableCell>

                    <TableCell className="py-4 align-top">
                      <InsigniaCarpeta documento={documento} plan={plan} />
                    </TableCell>

                    <TableCell className="py-4 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => intentarVer(documento)}
                          aria-label={`Ver ${documento.titulo}`}
                        >
                          {bloqueado ? <Lock className="size-3.5" /> : <Eye className="size-3.5" />}
                          Ver
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label="Más acciones">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {documento.carpeta === "EMITIDA" ? (
                              <DropdownMenuItem onSelect={() => descargar(documento)}>
                                <Download /> Descargar original
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Lock /> Copia restringida
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setAEliminar(documento)}>
                              <Trash2 /> Eliminar de la biblioteca
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <span>Filas por página</span>
            <Select
              value={`${porPagina}`}
              onValueChange={(valor) => {
                setPorPagina(Number(valor));
                setPagina(0);
              }}
            >
              <SelectTrigger size="sm" className="w-20" aria-label="Filas por página">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 50].map((tamano) => (
                    <SelectItem key={tamano} value={`${tamano}`}>
                      {tamano}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm tabular-nums">
              Página {paginaActual + 1} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={paginaActual === 0}
              onClick={() => setPagina(paginaActual - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={paginaActual >= totalPaginas - 1}
              onClick={() => setPagina(paginaActual + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={aEliminar !== null} onOpenChange={(abierto) => !abierto && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente «{aEliminar?.titulo}» de la biblioteca. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={eliminando} onClick={() => void confirmarEliminacion()}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
