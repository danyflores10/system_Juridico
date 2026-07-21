"use client";

import type * as React from "react";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Largo mínimo de la consulta para empezar a buscar dentro del documento. */
export const MINIMO_CONSULTA = 2;

interface PropiedadesBarra {
  consulta: string;
  onConsultaChange: (valor: string) => void;
  total: number;
  indiceActual: number;
  indexando: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
  onCerrar: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

/**
 * Barra flotante de búsqueda dentro del documento (estilo Ctrl+F del
 * navegador): campo de texto, contador de coincidencias y navegación.
 */
export function BarraBusquedaVisor({
  consulta,
  onConsultaChange,
  total,
  indiceActual,
  indexando,
  onAnterior,
  onSiguiente,
  onCerrar,
  inputRef,
  className,
}: PropiedadesBarra) {
  const consultaActiva = consulta.trim().length >= MINIMO_CONSULTA;
  const sinResultados = consultaActiva && !indexando && total === 0;

  function manejarTecla(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      if (evento.shiftKey) onAnterior();
      else onSiguiente();
    }
  }

  return (
    <search
      aria-label="Búsqueda dentro del documento"
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-background/95 py-1 pr-1 pl-3 shadow-lg backdrop-blur-sm",
        sinResultados && "border-destructive/40",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        ref={inputRef}
        value={consulta}
        onChange={(evento) => onConsultaChange(evento.target.value)}
        onKeyDown={manejarTecla}
        placeholder="Buscar en el documento…"
        aria-label="Texto a buscar en el documento"
        className="h-8 w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      {indexando ? <Spinner className="size-3.5 shrink-0 text-muted-foreground" /> : null}
      {!indexando && consultaActiva ? (
        <span
          aria-live="polite"
          className={cn(
            "shrink-0 whitespace-nowrap px-1 text-xs tabular-nums",
            sinResultados ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {total > 0 ? `${indiceActual + 1} de ${total}` : "Sin resultados"}
        </span>
      ) : null}

      <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-5" />

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={total === 0}
        onClick={onAnterior}
        aria-label="Coincidencia anterior (Shift+Enter)"
        title="Coincidencia anterior (Shift+Enter)"
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={total === 0}
        onClick={onSiguiente}
        aria-label="Coincidencia siguiente (Enter)"
        title="Coincidencia siguiente (Enter)"
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={onCerrar}
        aria-label="Cerrar búsqueda (Esc)"
        title="Cerrar búsqueda (Esc)"
      >
        <X className="size-4" />
      </Button>
    </search>
  );
}
