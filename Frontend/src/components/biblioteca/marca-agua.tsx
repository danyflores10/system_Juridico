import { cn } from "@/lib/utils";

/**
 * Marca de agua institucional que se estampa en el centro de cada hoja del
 * lector. El PNG se sirve desde /public ya recortado y con transparencia real
 * (generado a partir de media/MARCADEAGUA.png), por lo que se superpone sobre
 * la página sin tapar el texto.
 *
 * Va dentro del contenedor de la hoja —no del visor— para que quede centrada
 * en cada página y acompañe al zoom y al cambio de página.
 */
export function MarcaAguaLibro({ className }: { readonly className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      {/* next/image no aporta aquí: es un asset estático fijo servido desde /public. */}
      {/* biome-ignore lint/performance/noImgElement: marca de agua estática, sin optimización necesaria */}
      <img
        src="/marca-agua-libros.png"
        alt=""
        draggable={false}
        className="w-[46%] max-w-md select-none opacity-[0.13] mix-blend-multiply dark:opacity-[0.16] dark:mix-blend-screen dark:invert"
      />
    </div>
  );
}
