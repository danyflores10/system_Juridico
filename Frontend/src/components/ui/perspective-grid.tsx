"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface PerspectiveGridProps {
  /** Clases extra para el contenedor. */
  className?: string;
  /** Número de celdas por fila/columna (por defecto: 32). */
  gridSize?: number;
  /** Muestra la viñeta radial que desvanece los bordes (por defecto: true). */
  showOverlay?: boolean;
  /** Radio (%) del desvanecimiento de la viñeta (por defecto: 80). */
  fadeRadius?: number;
  /** Color de las líneas de la retícula. */
  lineColor?: string;
  /** Color de una celda al pasar el cursor (cuando no se usa `hoverColors`). */
  hoverColor?: string;
  /** Paleta de colores: cada celda recibe uno de forma determinista. */
  hoverColors?: string[];
  /** Color hacia el que se funden los bordes (viñeta). */
  fadeColor?: string;
}

/**
 * Retícula en perspectiva 3D: las celdas se iluminan al pasar el cursor y se
 * apagan lentamente, creando un fondo dinámico y elegante.
 */
export function PerspectiveGrid({
  className,
  gridSize = 32,
  showOverlay = true,
  fadeRadius = 80,
  lineColor = "rgba(120,120,120,0.25)",
  hoverColor = "rgba(120,120,120,0.6)",
  hoverColors,
  fadeColor = "transparent",
}: PerspectiveGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const tiles = useMemo(() => Array.from({ length: gridSize * gridSize }), [gridSize]);

  // Color de cada celda: uno de la paleta, disperso de forma determinista para
  // evitar franjas regulares; si no hay paleta, se usa el color único.
  const colorPara = (i: number) => {
    if (!hoverColors || hoverColors.length === 0) return hoverColor;
    const dispersion = ((i * 2654435761) >>> 0) % hoverColors.length;
    return hoverColors[dispersion];
  };

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={
        {
          perspective: "2000px",
          transformStyle: "preserve-3d",
          "--grid-line": lineColor,
          "--fade-color": fadeColor,
        } as CSSProperties
      }
    >
      <div
        className="absolute grid aspect-square w-[80rem] origin-center"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%) rotateX(30deg) rotateY(-5deg) rotateZ(20deg) scale(2)",
          transformStyle: "preserve-3d",
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {mounted &&
          tiles.map((_, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: la retícula es estática y nunca se reordena.
              key={i}
              style={{ "--tile-hover": colorPara(i) } as CSSProperties}
              className="min-h-[1px] min-w-[1px] border border-[color:var(--grid-line)] bg-transparent transition-colors duration-[1500ms] hover:bg-[var(--tile-hover)] hover:duration-0"
            />
          ))}
      </div>

      {showOverlay && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: `radial-gradient(circle, transparent 25%, var(--fade-color) ${fadeRadius}%)`,
          }}
        />
      )}
    </div>
  );
}

export default PerspectiveGrid;
