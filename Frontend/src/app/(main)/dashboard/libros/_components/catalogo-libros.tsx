"use client";

import * as React from "react";

import Link from "next/link";

import { BookMarked, LibraryBig, Search, Upload, X } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { OPCIONES_ORDEN_LIBROS, type OrdenLibros } from "@/data/libros-catalogo";

import { TarjetaLibro } from "./tarjeta-libro";
import { FILTROS_INICIALES, type Libro } from "./tipos";
import { VisorLibro } from "./visor-libro";

/** Valor del selector de materia cuando no hay filtro aplicado. */
const TODAS_LAS_MATERIAS = "__todas__";

export function CatalogoLibros() {
  const [libros, setLibros] = React.useState<Libro[]>([]);
  const [materias, setMaterias] = React.useState<string[]>([]);
  const [cargando, setCargando] = React.useState(true);

  const [consulta, setConsulta] = React.useState(FILTROS_INICIALES.consulta);
  const [materia, setMateria] = React.useState(TODAS_LAS_MATERIAS);
  const [orden, setOrden] = React.useState<OrdenLibros>(FILTROS_INICIALES.orden);

  const [libroAbierto, setLibroAbierto] = React.useState<Libro | null>(null);
  const [visorAbierto, setVisorAbierto] = React.useState(false);
  const [aEliminar, setAEliminar] = React.useState<Libro | null>(null);
  const [eliminando, setEliminando] = React.useState(false);

  // Consulta con espera para no golpear la API en cada tecla.
  const [consultaAplicada, setConsultaAplicada] = React.useState("");
  React.useEffect(() => {
    const temporizador = window.setTimeout(() => setConsultaAplicada(consulta.trim()), 280);
    return () => window.clearTimeout(temporizador);
  }, [consulta]);

  const cargarLibros = React.useCallback(async () => {
    setCargando(true);
    try {
      const parametros = new URLSearchParams({ orden });
      if (consultaAplicada !== "") parametros.set("q", consultaAplicada);
      if (materia !== TODAS_LAS_MATERIAS) parametros.set("materia", materia);

      const respuesta = await fetch(`/api/biblioteca/libros?${parametros.toString()}`);
      const datos: { libros?: Libro[]; error?: string } = await respuesta.json();

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible obtener el catálogo.");
        setLibros([]);
        return;
      }

      setLibros(datos.libros ?? []);
    } catch {
      toast.error("No fue posible comunicarse con el servidor.");
      setLibros([]);
    } finally {
      setCargando(false);
    }
  }, [consultaAplicada, materia, orden]);

  React.useEffect(() => {
    void cargarLibros();
  }, [cargarLibros]);

  const cargarMaterias = React.useCallback(async () => {
    try {
      const respuesta = await fetch("/api/biblioteca/libros/materias");
      const datos: { materias?: string[] } = await respuesta.json();
      setMaterias(datos.materias ?? []);
    } catch {
      setMaterias([]);
    }
  }, []);

  React.useEffect(() => {
    void cargarMaterias();
  }, [cargarMaterias]);

  function abrirLibro(libro: Libro) {
    setLibroAbierto(libro);
    setVisorAbierto(true);
  }

  async function confirmarEliminacion() {
    if (!aEliminar) return;

    setEliminando(true);
    try {
      const respuesta = await fetch(`/api/biblioteca/libros/${aEliminar.id}`, { method: "DELETE" });
      const datos: { error?: string } = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        toast.error(datos.error ?? "No fue posible retirar el libro.");
        return;
      }

      toast.success(`«${aEliminar.titulo}» se retiró del catálogo.`);
      setAEliminar(null);
      await Promise.all([cargarLibros(), cargarMaterias()]);
    } catch {
      toast.error("No fue posible comunicarse con el servidor.");
    } finally {
      setEliminando(false);
    }
  }

  const hayFiltros = consulta.trim() !== "" || materia !== TODAS_LAS_MATERIAS;

  function limpiarFiltros() {
    setConsulta("");
    setMateria(TODAS_LAS_MATERIAS);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 font-semibold text-2xl tracking-tight">
            <LibraryBig className="size-6 text-primary" />
            Biblioteca de libros
          </h1>
          <p className="text-muted-foreground text-sm">
            Consulte los libros jurídicos del despacho. La lectura es en línea y protegida: los libros no se descargan.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/libros/cargar">
            <Upload className="size-4" />
            Subir libro
          </Link>
        </Button>
      </header>

      <section className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
          <Input
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscar por título, autor, materia o contenido del libro…"
            aria-label="Buscar en el catálogo de libros"
            className="pl-9"
          />
        </div>

        <Select value={materia} onValueChange={setMateria}>
          <SelectTrigger className="w-52" aria-label="Filtrar por materia">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={TODAS_LAS_MATERIAS}>Todas las materias</SelectItem>
              {materias.map((opcion) => (
                <SelectItem key={opcion} value={opcion}>
                  {opcion}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={orden} onValueChange={(valor) => setOrden(valor as OrdenLibros)}>
          <SelectTrigger className="w-52" aria-label="Ordenar el catálogo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {OPCIONES_ORDEN_LIBROS.map((opcion) => (
                <SelectItem key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {hayFiltros ? (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
            <X className="size-3.5" />
            Limpiar
          </Button>
        ) : null}

        <span className="ml-auto flex items-center gap-2 text-muted-foreground text-sm tabular-nums">
          {cargando ? <Spinner className="size-3.5" /> : null}
          {libros.length} {libros.length === 1 ? "libro" : "libros"}
        </span>
      </section>

      {cargando && libros.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {["c1", "c2", "c3", "c4", "c5"].map((clave) => (
            <div key={clave} className="overflow-hidden rounded-xl border">
              <Skeleton className="aspect-3/4 w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!cargando && libros.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <BookMarked className="size-10 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">
              {hayFiltros ? "Ningún libro coincide con la búsqueda" : "Todavía no hay libros en el catálogo"}
            </p>
            <p className="text-muted-foreground text-sm">
              {hayFiltros
                ? "Pruebe con otras palabras o quite los filtros aplicados."
                : "Suba el primer libro para que aparezca aquí."}
            </p>
          </div>
          {hayFiltros ? (
            <Button variant="outline" size="sm" onClick={limpiarFiltros}>
              Quitar filtros
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href="/dashboard/libros/cargar">
                <Upload className="size-4" />
                Subir libro
              </Link>
            </Button>
          )}
        </div>
      ) : null}

      {libros.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {libros.map((libro) => (
            <TarjetaLibro key={libro.id} libro={libro} onLeer={abrirLibro} onEliminar={setAEliminar} />
          ))}
        </div>
      ) : null}

      <VisorLibro libro={libroAbierto} abierto={visorAbierto} onOpenChange={setVisorAbierto} />

      <AlertDialog open={aEliminar !== null} onOpenChange={(abierto) => !abierto && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar este libro del catálogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente «{aEliminar?.titulo}» y su archivo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={eliminando} onClick={() => void confirmarEliminacion()}>
              Retirar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
