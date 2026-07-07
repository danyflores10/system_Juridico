"use client";

import * as React from "react";

import { format } from "date-fns";
import { BookOpen, CalendarDays, Eraser, FileSearch, FolderOpen, Hash, Scale, Search, Type, X } from "lucide-react";
import { es } from "react-day-picker/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CARPETAS, type Carpeta, TIPOS_NORMA } from "@/data/biblioteca-catalogo";

import { CRITERIOS_INICIALES, type CriteriosBusqueda } from "./tipos";

interface PropiedadesPanel {
  materias: string[];
  buscando: boolean;
  onBuscar: (criterios: CriteriosBusqueda) => void;
}

function EncabezadoSeccion({ icono: Icono, children }: { icono: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-medium text-sm">
      <Icono className="size-4 text-muted-foreground" />
      {children}
    </div>
  );
}

function SelectorFecha({
  valor,
  onCambiar,
  etiqueta,
}: {
  valor: Date | undefined;
  onCambiar: (fecha: Date | undefined) => void;
  etiqueta: string;
}) {
  const [abierto, setAbierto] = React.useState(false);

  return (
    <div className="flex items-center gap-1">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="w-full justify-start px-2 font-normal">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            {valor ? format(valor, "dd/MM/yyyy") : <span className="text-muted-foreground">{etiqueta}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={valor}
            onSelect={(fecha) => {
              onCambiar(fecha);
              setAbierto(false);
            }}
            locale={es}
            captionLayout="dropdown"
            defaultMonth={valor}
            startMonth={new Date(1900, 0)}
            endMonth={new Date(new Date().getFullYear(), 11)}
          />
        </PopoverContent>
      </Popover>
      {valor ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          aria-label={`Quitar fecha ${etiqueta}`}
          onClick={() => onCambiar(undefined)}
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

export function PanelCriterios({ materias, buscando, onBuscar }: PropiedadesPanel) {
  const [carpetas, setCarpetas] = React.useState<Carpeta[]>([...CRITERIOS_INICIALES.carpetas]);
  const [tipos, setTipos] = React.useState<string[]>([]);
  const [numero, setNumero] = React.useState("");
  const [fechaDesde, setFechaDesde] = React.useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = React.useState<Date | undefined>(undefined);
  const [titulo, setTitulo] = React.useState("");
  const [materiasSeleccionadas, setMateriasSeleccionadas] = React.useState<string[]>([]);
  const [objeto, setObjeto] = React.useState("");

  const todaLaNormativa = tipos.length === 0;

  function alternarEnLista(lista: string[], valor: string): string[] {
    return lista.includes(valor) ? lista.filter((elemento) => elemento !== valor) : [...lista, valor];
  }

  function alternarCarpeta(carpeta: Carpeta) {
    setCarpetas((actuales) => {
      const nuevas = actuales.includes(carpeta)
        ? actuales.filter((elemento) => elemento !== carpeta)
        : [...actuales, carpeta];
      return nuevas.length === 0 ? actuales : nuevas;
    });
  }

  function construirCriterios(): CriteriosBusqueda {
    return {
      tipos,
      numero: numero.trim(),
      fechaDesde: fechaDesde ? format(fechaDesde, "yyyy-MM-dd") : null,
      fechaHasta: fechaHasta ? format(fechaHasta, "yyyy-MM-dd") : null,
      titulo: titulo.trim(),
      materias: materiasSeleccionadas,
      objeto: objeto.trim(),
      carpetas,
    };
  }

  function limpiar() {
    setCarpetas([...CRITERIOS_INICIALES.carpetas]);
    setTipos([]);
    setNumero("");
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setTitulo("");
    setMateriasSeleccionadas([]);
    setObjeto("");
    onBuscar(CRITERIOS_INICIALES);
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-base leading-none">
          <Search className="size-4 text-primary" />
          Criterios de búsqueda
        </CardTitle>
        <CardDescription className="leading-snug">
          Combine uno o más criterios para encontrar la normativa.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="flex flex-col gap-5"
          onSubmit={(evento) => {
            evento.preventDefault();
            onBuscar(construirCriterios());
          }}
        >
          {/* Carpetas de la biblioteca */}
          <div className="flex flex-col gap-2.5">
            <EncabezadoSeccion icono={FolderOpen}>Carpetas de la biblioteca</EncabezadoSeccion>
            {CARPETAS.map((carpeta) => (
              <Label
                key={carpeta.valor}
                className="flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 font-normal transition-colors has-[[aria-checked=true]]:border-primary/40 has-[[aria-checked=true]]:bg-primary/5"
              >
                <Checkbox
                  checked={carpetas.includes(carpeta.valor)}
                  onCheckedChange={() => alternarCarpeta(carpeta.valor)}
                  className="mt-0.5"
                />
                <span className="grid gap-0.5">
                  <span className="text-sm leading-none">{carpeta.etiqueta}</span>
                  <span className="text-muted-foreground text-xs">{carpeta.descripcion}</span>
                </span>
              </Label>
            ))}
          </div>

          <Separator />

          {/* i. Tipo de norma */}
          <div className="flex flex-col gap-2.5">
            <EncabezadoSeccion icono={Scale}>Tipo de norma</EncabezadoSeccion>
            <Label className="flex cursor-pointer items-center gap-2.5 font-normal">
              <Checkbox
                checked={todaLaNormativa}
                onCheckedChange={(marcado) => {
                  if (marcado) setTipos([]);
                }}
              />
              <span className="text-sm">Toda la normativa</span>
            </Label>
            <ScrollArea className="h-48 rounded-md border">
              <div className="flex flex-col gap-0.5 p-2">
                {TIPOS_NORMA.map((tipo) => (
                  <Label
                    key={tipo.codigo}
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1.5 py-1.5 font-normal transition-colors hover:bg-muted/60"
                  >
                    <Checkbox
                      checked={tipos.includes(tipo.codigo)}
                      onCheckedChange={() => setTipos((actuales) => alternarEnLista(actuales, tipo.codigo))}
                    />
                    <Badge variant="outline" className="w-12 justify-center px-1 font-mono text-[10px]">
                      {tipo.codigo}
                    </Badge>
                    <span className="text-xs leading-tight">{tipo.nombre}</span>
                  </Label>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* ii. Número de norma */}
          <div className="flex flex-col gap-2">
            <EncabezadoSeccion icono={Hash}>Número de norma</EncabezadoSeccion>
            <Input
              value={numero}
              onChange={(evento) => setNumero(evento.target.value)}
              placeholder="Ej.: 2492"
              aria-label="Número de norma"
            />
          </div>

          {/* iii. Rango de fecha de promulgación */}
          <div className="flex flex-col gap-2">
            <EncabezadoSeccion icono={CalendarDays}>Fecha de promulgación</EncabezadoSeccion>
            <div className="grid grid-cols-2 gap-2">
              <SelectorFecha valor={fechaDesde} onCambiar={setFechaDesde} etiqueta="Desde" />
              <SelectorFecha valor={fechaHasta} onCambiar={setFechaHasta} etiqueta="Hasta" />
            </div>
          </div>

          {/* iv. Título */}
          <div className="flex flex-col gap-2">
            <EncabezadoSeccion icono={Type}>Título</EncabezadoSeccion>
            <Input
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="Ej.: Código Tributario"
              aria-label="Título de la norma"
            />
          </div>

          {/* v. Materia */}
          <div className="flex flex-col gap-2">
            <EncabezadoSeccion icono={BookOpen}>Materia</EncabezadoSeccion>
            {materias.length === 0 ? (
              <p className="text-muted-foreground text-xs">Aún no hay materias registradas en la biblioteca.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                <div className="flex flex-col gap-0.5 p-2">
                  {materias.map((materia) => (
                    <Label
                      key={materia}
                      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1.5 py-1.5 font-normal transition-colors hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={materiasSeleccionadas.includes(materia)}
                        onCheckedChange={() =>
                          setMateriasSeleccionadas((actuales) => alternarEnLista(actuales, materia))
                        }
                      />
                      <span className="text-xs leading-tight">{materia}</span>
                    </Label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* vi. Objeto o contenido resumido */}
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <EncabezadoSeccion icono={FileSearch}>Objeto o contenido</EncabezadoSeccion>
              <Badge variant="secondary" className="text-[10px]">
                Dentro del documento
              </Badge>
            </div>
            <Textarea
              value={objeto}
              onChange={(evento) => setObjeto(evento.target.value)}
              placeholder="Ej.: crédito fiscal, estabilidad laboral, feminicidio…"
              className="min-h-16 resize-none bg-background"
              aria-label="Objeto o contenido resumido"
            />
            <p className="text-muted-foreground text-xs leading-snug">
              Es el criterio más importante: busca las palabras dentro del contenido completo de cada archivo.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={buscando}>
              {buscando ? <Spinner className="size-4" /> : <Search className="size-4" />}
              Buscar
            </Button>
            <Button type="button" variant="outline" onClick={limpiar} disabled={buscando}>
              <Eraser className="size-4" />
              Limpiar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
