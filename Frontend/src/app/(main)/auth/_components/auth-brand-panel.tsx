"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { CalendarClock, FolderKanban, ShieldCheck } from "lucide-react";

import { PerspectiveGrid } from "@/components/ui/perspective-grid";
import { Typewriter } from "@/components/ui/typewriter";
import { APP_CONFIG } from "@/config/app-config";

const trust = [
  { icon: ShieldCheck, label: "Datos protegidos" },
  { icon: FolderKanban, label: "Todo en un lugar" },
  { icon: CalendarClock, label: "Sin plazos perdidos" },
];

// Los cuatro pilares del sistema, que el titular escribe y borra en bucle.
const palabrasHero = ["Consultor Jurídico", "Expedientes", "Clientes", "Audiencias", "Documentos"];

// Paleta tomada del logo: azul marino #022658 y azul vivo #1279fd
const panelBackground = {
  background:
    "radial-gradient(720px circle at 15% 8%, rgba(18, 121, 253, 0.2), transparent 55%)," +
    "radial-gradient(560px circle at 90% 92%, rgba(18, 121, 253, 0.12), transparent 52%)," +
    "linear-gradient(165deg, #061e46 0%, #04173a 48%, #020a1e 100%)",
};

export function AuthBrandPanel() {
  return (
    <div
      className="relative order-2 hidden h-full flex-col justify-between overflow-hidden rounded-3xl p-10 lg:flex"
      style={panelBackground}
    >
      {/* Fondo: retícula 3D interactiva en los colores de la marca */}
      <PerspectiveGrid
        className="absolute inset-0"
        gridSize={34}
        fadeRadius={78}
        lineColor="rgba(18,121,253,0.14)"
        hoverColors={[
          "rgba(77,154,255,0.55)", // azul de la marca
          "rgba(56,189,248,0.5)", // cielo
          "rgba(45,212,191,0.5)", // teal
          "rgba(52,211,153,0.5)", // esmeralda
          "rgba(129,140,248,0.5)", // índigo
          "rgba(167,139,250,0.5)", // violeta
          "rgba(240,177,77,0.45)", // dorado suave
        ]}
        fadeColor="#04173a"
      />

      {/* Velo radial para dar legibilidad al contenido central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 62% 55% at 50% 52%, rgba(2,10,30,0.55), transparent 72%)" }}
      />

      {/* Filo interior sutil */}
      <div className="pointer-events-none absolute inset-0 z-20 rounded-3xl ring-1 ring-[#1279fd]/20 ring-inset" />

      {/* Contenido: no captura el mouse, así la retícula de fondo queda interactiva */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between">
        {/* Marca */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_30px_rgba(18,121,253,0.35)] ring-1 ring-white/60"
          >
            <Image src="/logo-cj-icon.png" alt={APP_CONFIG.name} width={40} height={40} className="size-9" priority />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-0.5"
          >
            <p className="font-semibold text-lg text-white leading-none tracking-tight">{APP_CONFIG.name}</p>
            <p className="text-[#9ec7ff]/80 text-xs">Plataforma de gestión legal</p>
          </motion.div>
        </div>

        {/* Hero central: medallón + titular dinámico */}
        <div className="flex flex-1 flex-col items-center justify-center gap-7 py-8 text-center">
          <div className="relative flex size-36 items-center justify-center">
            {/* Anillo giratorio punteado */}
            <motion.div
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute inset-0 rounded-full border border-[#1279fd]/30 border-dashed"
            />
            {/* Satélite luminoso orbitando */}
            <motion.div
              aria-hidden
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
              className="absolute inset-0"
            >
              <span className="-translate-x-1/2 -top-1 absolute left-1/2 size-2 rounded-full bg-[#4d9aff] shadow-[0_0_14px_5px_rgba(18,121,253,0.55)]" />
            </motion.div>
            {/* Medallón central con el logo */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex size-28 items-center justify-center rounded-full bg-linear-to-b from-white via-[#f4f8ff] to-[#dce9ff] shadow-[0_0_70px_rgba(18,121,253,0.4),inset_0_-10px_24px_rgba(18,121,253,0.12)] ring-1 ring-white/70"
            >
              <Image
                src="/logo-cj-icon.png"
                alt=""
                width={72}
                height={73}
                className="size-[4.5rem] drop-shadow-sm"
                priority
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-2"
          >
            <h2 className="flex min-h-[2.75rem] items-center justify-center font-semibold text-4xl text-white tracking-tight">
              <Typewriter words={palabrasHero} caretClassName="bg-[#4d9aff]" />
            </h2>
            <p className="text-[#9ec7ff]/80 text-sm">Gestión legal clara, segura y profesional.</p>
          </motion.div>
        </div>

        {/* Sellos de confianza */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-white/10 border-t pt-6">
          {trust.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 + i * 0.12 }}
              className="flex items-center gap-2"
            >
              <item.icon className="size-4 text-[#6fb0ff]" />
              <span className="text-sm text-white/65">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
