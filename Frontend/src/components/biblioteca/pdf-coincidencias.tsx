"use client";

import * as React from "react";

import { buscarCoincidencias, type RangoCoincidencia } from "@/lib/texto-busqueda";
import { cn } from "@/lib/utils";

export type ModuloPdfjs = typeof import("pdfjs-dist");

/** Fragmento de texto de una página del PDF, con su posición dentro de ella. */
export interface ItemTextoPdf {
  str: string;
  transform: number[];
  width: number;
  hasEOL?: boolean;
}

/** Texto extraído de una página, listo para buscar y ubicar coincidencias. */
export interface PaginaIndexada {
  items: ItemTextoPdf[];
  transformVista: number[];
}

/** Rectángulo de resaltado en coordenadas de la página a escala 1. */
export interface RectResaltado {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Una coincidencia de la búsqueda interna: página y rectángulos a pintar. */
export interface CoincidenciaPdf {
  pagina: number;
  rects: RectResaltado[];
}

/**
 * Localiza la consulta en el texto de cada página y calcula los rectángulos
 * de resaltado (a escala 1; el visor los multiplica por el zoom actual).
 * La comparación ignora mayúsculas, tildes y saltos de línea.
 */
export function calcularCoincidenciasPdf(
  paginas: PaginaIndexada[],
  consulta: string,
  pdfjs: ModuloPdfjs,
): CoincidenciaPdf[] {
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
export function TextoResaltado({
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
