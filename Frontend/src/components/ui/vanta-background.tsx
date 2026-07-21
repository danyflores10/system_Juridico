"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface InstanciaVanta {
  destroy: () => void;
}

/** Efectos de Vanta.js disponibles en el proyecto. */
export type EfectoVanta = "clouds2" | "fog";

/** Opciones de color y movimiento; cada efecto usa las suyas. */
interface OpcionesVanta {
  // CLOUDS2
  skyColor?: number;
  cloudColor?: number;
  lightColor?: number;
  backgroundColor?: number;
  // FOG
  highlightColor?: number;
  midtoneColor?: number;
  lowlightColor?: number;
  baseColor?: number;
  blurFactor?: number;
  zoom?: number;
  // Comunes
  speed?: number;
}

interface VantaBackgroundProps extends OpcionesVanta {
  efecto: EfectoVanta;
  className?: string;
}

/** Carga el bundle del efecto pedido (rutas estáticas para que el empaquetador las resuelva). */
async function cargarEfecto(efecto: EfectoVanta) {
  if (efecto === "fog") {
    return (await import("vanta/dist/vanta.fog.min")).default;
  }
  return (await import("vanta/dist/vanta.clouds2.min")).default;
}

/**
 * Fondo animado de Vanta.js (sobre three.js).
 *
 * Se carga solo en el cliente y bajo demanda: three.js pesa lo suyo, no debe
 * entrar en el paquete inicial y necesita WebGL, que no existe en el servidor.
 * Mientras carga —o si el efecto no puede iniciarse— queda visible el fondo
 * que haya debajo, así que la pantalla nunca se ve rota.
 */
export function VantaBackground({ efecto, className, ...opciones }: VantaBackgroundProps) {
  const contenedorRef = useRef<HTMLDivElement | null>(null);
  const [activo, setActivo] = useState(false);

  const {
    skyColor,
    cloudColor,
    lightColor,
    backgroundColor,
    highlightColor,
    midtoneColor,
    lowlightColor,
    baseColor,
    blurFactor,
    zoom,
    speed,
  } = opciones;

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let instancia: InstanciaVanta | null = null;
    let cancelado = false;
    let cargando = false;

    async function iniciar() {
      if (instancia || cargando || cancelado || !contenedor) return;
      cargando = true;

      try {
        const [crear, THREE] = await Promise.all([cargarEfecto(efecto), import("three")]);
        // Entre la carga y este punto el panel pudo ocultarse (o desmontarse).
        if (cancelado || contenedor.clientWidth === 0) return;

        instancia = crear({
          el: contenedor,
          THREE,
          mouseControls: true,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          // CLOUDS2 necesita una textura de ruido; FOG ignora esta opción.
          texturePath: "/vanta-noise.png",
          skyColor,
          cloudColor,
          lightColor,
          backgroundColor,
          highlightColor,
          midtoneColor,
          lowlightColor,
          baseColor,
          blurFactor,
          zoom,
          speed,
        });
        setActivo(true);
      } catch (error) {
        // Sin WebGL (o si falla la carga) se conserva el fondo de respaldo.
        console.error("No fue posible iniciar el fondo animado:", error);
      } finally {
        cargando = false;
      }
    }

    function detener() {
      instancia?.destroy();
      instancia = null;
      setActivo(false);
    }

    /*
     * El panel que contiene el fondo puede ocultarse con `display:none` en
     * pantallas pequeñas, y un elemento oculto mide 0. Observar su tamaño evita
     * gastar GPU, memoria y batería mientras no se ve, y arranca el efecto en
     * cuanto aparece (por ejemplo al ensanchar la ventana).
     */
    const observador = new ResizeObserver(() => {
      if (contenedor.clientWidth > 0) void iniciar();
      else detener();
    });
    observador.observe(contenedor);

    return () => {
      cancelado = true;
      observador.disconnect();
      detener();
    };
  }, [
    efecto,
    skyColor,
    cloudColor,
    lightColor,
    backgroundColor,
    highlightColor,
    midtoneColor,
    lowlightColor,
    baseColor,
    blurFactor,
    zoom,
    speed,
  ]);

  return (
    <div
      ref={contenedorRef}
      aria-hidden
      className={cn(
        "absolute inset-0 transition-opacity duration-1000",
        activo ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
