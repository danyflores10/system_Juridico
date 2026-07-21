"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { CalendarClock, FolderKanban, ShieldCheck } from "lucide-react";

import NeuralLinkBackground from "@/components/lightswind/neural-link";
import { Typewriter } from "@/components/ui/typewriter";
import { APP_CONFIG } from "@/config/app-config";

const SELLOS = [
  { icon: ShieldCheck, label: "Datos protegidos" },
  { icon: FolderKanban, label: "Todo en un lugar" },
  { icon: CalendarClock, label: "Sin plazos perdidos" },
];

/** Pilares del sistema; el titular los escribe y borra en bucle. */
const PALABRAS = ["Expedientes", "Audiencias", "Clientes", "Documentos", "Honorarios"];

const LOGO = "/logo-cj-plata.png";

/** Fondo del panel: blanco con halos muy tenues en el azul de la marca. */
const FONDO = {
  background:
    "radial-gradient(760px circle at 18% 6%, rgba(18, 121, 253, 0.10), transparent 58%)," +
    "radial-gradient(620px circle at 88% 94%, rgba(2, 38, 88, 0.07), transparent 56%)," +
    "linear-gradient(165deg, #ffffff 0%, #f8fafd 55%, #eef3fa 100%)",
};

/** Destello metálico que recorre el logo, recortado por su propia silueta. */
const BRILLO = {
  maskImage: `url(${LOGO})`,
  WebkitMaskImage: `url(${LOGO})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskPosition: "center",
  backgroundImage: "linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.9) 50%, transparent 62%)",
  backgroundSize: "260% 100%",
  backgroundRepeat: "no-repeat",
};

const SUAVE = [0.16, 1, 0.3, 1] as const;

/**
 * Panel lateral de las pantallas de acceso: presenta la marca con el logo
 * plateado en grande sobre un lienzo blanco con la red neuronal animada.
 */
export function AuthHeroPanel() {
  return (
    <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between" style={FONDO}>
      {/* Red neuronal animada: los nodos se enlazan y enrutan paquetes hacia el cursor.
          Sobre fondo claro el componente fija su propia paleta (nodos y líneas
          índigo, paquetes verde azulado), que es la del demo de Lightswind. */}
      <NeuralLinkBackground
        darkPalette={false}
        nodeCount={80}
        maxDistance={110}
        interactionMode="router"
        interactive
        packetFrequency={2000}
      />

      {/* Velo radial claro: da legibilidad al contenido sobre la red */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 66% 60% at 50% 50%, rgba(255,255,255,0.85), rgba(255,255,255,0.35) 74%)",
        }}
      />

      {/* El contenido no captura el puntero: la retícula sigue siendo interactiva */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
        {/* Marca */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: SUAVE }}
          className="flex items-center gap-3.5"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white shadow-[0_8px_24px_rgba(2,38,88,0.14)] ring-1 ring-[#022658]/8">
            <Image src="/logo-cj-icon.png" alt="" width={32} height={32} className="size-7" priority />
          </span>
          <span className="space-y-0.5">
            <p className="font-semibold text-[#022658] text-base leading-none tracking-tight">{APP_CONFIG.name}</p>
            <p className="text-[#6b8099] text-xs">Plataforma de gestión legal</p>
          </span>
        </motion.div>

        {/* Escudo central con el logo plateado */}
        <div className="flex flex-1 flex-col items-center justify-center gap-9 py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.15, ease: SUAVE }}
            className="relative flex items-center justify-center"
          >
            {/* Halo que late detrás del logo */}
            <motion.span
              aria-hidden
              animate={{ opacity: [0.4, 0.75, 0.4], scale: [0.94, 1.06, 0.94] }}
              transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="absolute size-[30rem] rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(18,121,253,0.22) 0%, transparent 68%)" }}
            />

            {/* Anillo punteado exterior */}
            <motion.span
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 60, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute size-[28rem] rounded-full border border-[#1279fd]/30 border-dashed xl:size-[31rem]"
            />

            {/* Anillo interior con un satélite orbitando */}
            <motion.span
              aria-hidden
              animate={{ rotate: -360 }}
              transition={{ duration: 26, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute size-[23rem] rounded-full border border-[#022658]/10 xl:size-[25.5rem]"
            >
              <span className="-translate-x-1/2 -top-[3px] absolute left-1/2 size-1.5 rounded-full bg-[#1279fd] shadow-[0_0_12px_4px_rgba(18,121,253,0.45)]" />
            </motion.span>

            {/* Logo: flota suavemente y recibe un destello metálico periódico */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              className="relative size-[20rem] xl:size-[23rem]"
            >
              <Image
                src={LOGO}
                alt={APP_CONFIG.name}
                fill
                sizes="(min-width: 1280px) 23rem, 20rem"
                priority
                className="object-contain drop-shadow-[0_16px_34px_rgba(2,38,88,0.20)]"
              />
              <motion.span
                aria-hidden
                className="absolute inset-0"
                style={BRILLO}
                initial={{ backgroundPositionX: "150%" }}
                animate={{ backgroundPositionX: ["150%", "-50%"] }}
                transition={{
                  duration: 2.4,
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 3.6,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Titular dinámico */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: SUAVE }}
            className="space-y-2.5 text-center"
          >
            <h2 className="flex min-h-[3rem] items-center justify-center font-semibold text-4xl text-[#022658] tracking-tight xl:text-[2.75rem]">
              <Typewriter words={PALABRAS} caretClassName="bg-[#1279fd]" />
            </h2>
            <p className="text-[#6b8099] text-sm">Gestión legal clara, segura y profesional.</p>
          </motion.div>
        </div>

        {/* Sellos de confianza */}
        <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-[#022658]/10 border-t pt-6">
          {SELLOS.map((sello, indice) => (
            <motion.span
              key={sello.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + indice * 0.12 }}
              className="flex items-center gap-2"
            >
              <sello.icon className="size-4 text-[#1279fd]" />
              <span className="text-[#5c7899] text-sm">{sello.label}</span>
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
