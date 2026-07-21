"use client";

import * as React from "react";

import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Por qué está oculto el contenido: pérdida de foco o intento de captura. */
export type MotivoBloqueo = "foco" | "captura" | null;

const TEXTO_PORTAPAPELES = "Documento protegido — Consultor Jurídico. Prohibida su reproducción.";

/**
 * Protección anti-captura del visor de documentos.
 *
 * El navegador no puede impedir una captura del sistema operativo, así que la
 * estrategia es dejarla sin valor:
 * - Al perder el foco o visibilidad la ventana (Win+Shift+S abre el recorte y
 *   roba el foco, igual que cambiar de aplicación), el contenido se difumina.
 * - La tecla Windows difumina de forma preventiva: el recorte congela la
 *   pantalla al abrirse, por lo que hay que ocultar antes de que llegue la S.
 * - Impr Pant no se puede vetar, pero el portapapeles se sobrescribe varias
 *   veces seguidas (Windows tarda unos ms en depositar la imagen) y el visor
 *   queda difuminado hasta que el lector decide continuar.
 * - Ctrl+P / Ctrl+S quedan bloqueados mientras el visor está abierto.
 */
export function useProteccionCaptura(habilitada: boolean) {
  const [motivo, setMotivo] = React.useState<MotivoBloqueo>(null);
  const motivoRef = React.useRef<MotivoBloqueo>(null);
  motivoRef.current = motivo;

  const continuar = React.useCallback(() => setMotivo(null), []);

  React.useEffect(() => {
    if (!habilitada) {
      setMotivo(null);
      return;
    }

    // "captura" es pegajoso (requiere clic en Continuar); "foco" se libera solo.
    const bloquear = (nuevo: Exclude<MotivoBloqueo, null>) =>
      setMotivo((previo) => (previo === "captura" ? previo : nuevo));
    const liberarFoco = () => {
      if (motivoRef.current === "foco") setMotivo(null);
    };

    const sobrescribirPortapapeles = () => {
      for (const espera of [0, 120, 280, 500]) {
        window.setTimeout(() => {
          void navigator.clipboard?.writeText(TEXTO_PORTAPAPELES).catch(() => undefined);
        }, espera);
      }
    };

    const alPerderFoco = () => bloquear("foco");
    const alRecuperarFoco = () => liberarFoco();
    const alCambiarVisibilidad = () => {
      if (document.hidden) bloquear("foco");
      else liberarFoco();
    };
    const alImprimir = () => bloquear("captura");

    const alTeclaAbajo = (evento: KeyboardEvent) => {
      if (evento.key === "PrintScreen") {
        bloquear("captura");
        sobrescribirPortapapeles();
        return;
      }
      // La tecla Windows en cualquier combinación (algunos navegadores la
      // reportan como "Meta", otros como "OS" o solo en getModifierState).
      const involucraTeclaWindows =
        evento.key === "Meta" || evento.key === "OS" || evento.metaKey || evento.getModifierState?.("Meta");
      if (involucraTeclaWindows) {
        bloquear("foco");
        return;
      }
      const tecla = evento.key.toLowerCase();
      if (evento.ctrlKey && (tecla === "p" || tecla === "s")) {
        evento.preventDefault();
        toast.warning("Función deshabilitada", {
          description: "La impresión y el guardado están bloqueados en el visor protegido.",
        });
      }
    };

    // En Windows, Impr Pant suele emitir solo keyup; se atienden ambos.
    const alTeclaArriba = (evento: KeyboardEvent) => {
      if (evento.key === "PrintScreen") {
        bloquear("captura");
        sobrescribirPortapapeles();
        return;
      }
      if (evento.key === "Meta" && document.hasFocus() && !document.hidden) liberarFoco();
    };

    window.addEventListener("blur", alPerderFoco);
    window.addEventListener("focus", alRecuperarFoco);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    window.addEventListener("beforeprint", alImprimir);
    window.addEventListener("keydown", alTeclaAbajo, true);
    window.addEventListener("keyup", alTeclaArriba, true);
    return () => {
      window.removeEventListener("blur", alPerderFoco);
      window.removeEventListener("focus", alRecuperarFoco);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.removeEventListener("beforeprint", alImprimir);
      window.removeEventListener("keydown", alTeclaAbajo, true);
      window.removeEventListener("keyup", alTeclaArriba, true);
    };
  }, [habilitada]);

  return { motivo, bloqueado: motivo !== null, continuar };
}

/**
 * Lente de lectura: el documento permanece difuminado salvo una franja
 * horizontal que sigue al puntero (o al dedo). El recorte de Windows congela
 * la pantalla antes de que llegue ningún evento al navegador, así que la única
 * defensa efectiva es que el documento nunca esté nítido por completo: una
 * captura en cualquier instante sale borrosa salvo la franja de lectura.
 */
const MASCARA_LENTE = [
  "linear-gradient(to bottom",
  "black 0%",
  "black calc(var(--lente-y, -9999px) - 215px)",
  "transparent calc(var(--lente-y, -9999px) - 125px)",
  "transparent calc(var(--lente-y, -9999px) + 125px)",
  "black calc(var(--lente-y, -9999px) + 215px)",
  "black 100%)",
].join(", ");

export function useLenteLectura(activa: boolean) {
  const lenteRef = React.useRef<HTMLDivElement | null>(null);
  const contenedorRef = React.useRef<HTMLDivElement | null>(null);
  // Coincidencia de búsqueda que la franja debe seguir (además del puntero).
  const coincidenciaRef = React.useRef<HTMLElement | null>(null);
  const punteroYRef = React.useRef<number | null>(null);
  const [revelando, setRevelando] = React.useState(false);

  const aplicarY = React.useCallback((y: number | null) => {
    lenteRef.current?.style.setProperty("--lente-y", y === null ? "-9999px" : `${Math.round(y)}px`);
    setRevelando(y !== null);
  }, []);

  // El puntero manda; si no hay puntero encima, la franja sigue la coincidencia
  // de búsqueda actual mientras esté dentro del área visible.
  const recalcular = React.useCallback(() => {
    if (!activa) {
      aplicarY(null);
      return;
    }
    if (punteroYRef.current !== null) {
      aplicarY(punteroYRef.current);
      return;
    }
    const contenedor = contenedorRef.current;
    const elemento = coincidenciaRef.current;
    if (contenedor && elemento) {
      const rectContenedor = contenedor.getBoundingClientRect();
      const rectElemento = elemento.getBoundingClientRect();
      const y = rectElemento.top + rectElemento.height / 2 - rectContenedor.top;
      aplicarY(y >= 0 && y <= rectContenedor.height ? y : null);
      return;
    }
    aplicarY(null);
  }, [activa, aplicarY]);

  const alMoverPuntero = React.useCallback(
    (evento: React.PointerEvent<HTMLElement>) => {
      if (!activa) return;
      const rect = evento.currentTarget.getBoundingClientRect();
      punteroYRef.current = evento.clientY - rect.top;
      aplicarY(punteroYRef.current);
    },
    [activa, aplicarY],
  );

  const alSalirPuntero = React.useCallback(() => {
    punteroYRef.current = null;
    // Al soltar el puntero, vuelve a revelar la coincidencia de búsqueda si la hay.
    recalcular();
  }, [recalcular]);

  /** Fija la coincidencia de búsqueda a seguir (o null para dejar de seguirla). */
  const seguirCoincidencia = React.useCallback(
    (elemento: HTMLElement | null) => {
      coincidenciaRef.current = elemento;
      elemento?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
      recalcular();
    },
    [recalcular],
  );

  // Mantiene la franja sobre la coincidencia durante el desplazamiento
  // (incluido el scroll suave que la lleva al centro).
  React.useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor || !activa) return;
    const alDesplazar = () => recalcular();
    contenedor.addEventListener("scroll", alDesplazar, { passive: true });
    return () => contenedor.removeEventListener("scroll", alDesplazar);
  }, [activa, recalcular]);

  return { lenteRef, contenedorRef, revelando, alMoverPuntero, alSalirPuntero, seguirCoincidencia, recalcular };
}

/** Capa difuminadora con la franja de lectura recortada mediante máscara CSS. */
export function LenteLectura({ lenteRef }: { lenteRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={lenteRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{
        backdropFilter: "blur(16px) saturate(0.85)",
        WebkitBackdropFilter: "blur(16px) saturate(0.85)",
        maskImage: MASCARA_LENTE,
        WebkitMaskImage: MASCARA_LENTE,
      }}
    />
  );
}

/** Cortina que cubre el documento mientras la protección está activa. */
export function EscudoCaptura({ motivo, onContinuar }: { motivo: MotivoBloqueo; onContinuar: () => void }) {
  if (!motivo) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-background/70 p-6 backdrop-blur-2xl">
      <div className="flex size-14 items-center justify-center rounded-full border bg-card shadow-sm">
        <ShieldAlert className="size-7 text-amber-500" />
      </div>
      <div className="max-w-xs text-center">
        <p className="font-semibold text-sm">Documento protegido</p>
        <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
          {motivo === "captura"
            ? "Se detectó un intento de captura o impresión. El contenido se ocultó y el portapapeles fue reemplazado."
            : "El contenido se oculta al salir de la ventana para impedir capturas. Vuelva aquí para seguir leyendo."}
        </p>
      </div>
      {motivo === "captura" ? (
        <Button size="sm" variant="outline" onClick={onContinuar}>
          Continuar leyendo
        </Button>
      ) : null}
    </div>
  );
}
