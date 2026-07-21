"use client";

import { BookOpen, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatearTamano } from "@/data/libros-catalogo";

import type { Libro } from "./tipos";

/**
 * Paleta de portadas de respaldo. El índice sale del identificador del libro,
 * así que cada ficha conserva siempre el mismo color.
 */
const LOMOS = [
  "from-[#0a3f8f] to-[#01142f]",
  "from-[#1279fd] to-[#0b3d84]",
  "from-[#134e4a] to-[#042f2e]",
  "from-[#6d28d9] to-[#2e1065]",
  "from-[#9a3412] to-[#431407]",
  "from-[#0f766e] to-[#0b3d3a]",
];

interface PropiedadesTarjeta {
  libro: Libro;
  onLeer: (libro: Libro) => void;
  onEliminar: (libro: Libro) => void;
}

export function TarjetaLibro({ libro, onLeer, onEliminar }: PropiedadesTarjeta) {
  const lomo = LOMOS[libro.id % LOMOS.length];
  const detalles = [
    libro.editorial,
    libro.edicion,
    libro.anioPublicacion?.toString(),
    libro.paginas ? `${libro.paginas} págs.` : null,
  ].filter((dato): dato is string => Boolean(dato && dato !== ""));

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <button
        type="button"
        onClick={() => onLeer(libro)}
        aria-label={`Leer ${libro.titulo}`}
        className="relative block aspect-3/4 w-full overflow-hidden bg-muted text-left"
      >
        {libro.tienePortada ? (
          // Portada real (primera página del libro); no usa next/image porque
          // la sirve una ruta privada de la API que no debe pasar por el optimizador.
          // biome-ignore lint/performance/noImgElement: la portada viene de una ruta privada sin optimización
          <img
            src={`/api/biblioteca/libros/${libro.id}/portada`}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className={`flex size-full flex-col justify-between bg-linear-to-br ${lomo} p-4`}>
            <span className="font-semibold text-[10px] text-white/60 uppercase tracking-[0.2em]">{libro.materia}</span>
            <div>
              <p className="line-clamp-4 font-semibold text-sm text-white leading-snug">{libro.titulo}</p>
              <p className="mt-1 line-clamp-1 text-white/70 text-xs">{libro.autor}</p>
            </div>
          </div>
        )}

        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground text-xs shadow-lg">
            <BookOpen className="size-3.5" />
            Leer
          </span>
        </span>
      </button>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex-1 space-y-1">
          <h3 className="line-clamp-2 font-semibold text-sm leading-snug" title={libro.titulo}>
            {libro.titulo}
          </h3>
          <p className="line-clamp-1 text-muted-foreground text-xs" title={libro.autor}>
            {libro.autor}
          </p>
        </div>

        <Badge variant="secondary" className="w-fit font-normal text-[10px]">
          {libro.materia}
        </Badge>

        {detalles.length > 0 ? (
          <p className="line-clamp-1 text-muted-foreground text-[11px]" title={detalles.join(" · ")}>
            {detalles.join(" · ")}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t pt-2">
          <span className="text-muted-foreground text-[11px] uppercase tracking-wide">
            {libro.extension} · {formatearTamano(libro.tamanoBytes)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:text-destructive"
            onClick={() => onEliminar(libro)}
            aria-label={`Retirar ${libro.titulo} del catálogo`}
            title="Retirar del catálogo"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
