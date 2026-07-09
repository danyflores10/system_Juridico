"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { CalendarClock, FileText, FolderKanban, ShieldCheck, Users } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

const orbitCards = [
  { icon: FolderKanban, label: "Expedientes", className: "-left-4 top-2", delay: 0 },
  { icon: Users, label: "Clientes", className: "-right-6 top-16", delay: 0.5 },
  { icon: CalendarClock, label: "Audiencias", className: "-left-2 bottom-4", delay: 1 },
  { icon: FileText, label: "Documentos", className: "-right-4 bottom-12", delay: 1.5 },
];

const trust = [
  { icon: ShieldCheck, label: "Datos protegidos" },
  { icon: FolderKanban, label: "Todo en un lugar" },
  { icon: CalendarClock, label: "Sin plazos perdidos" },
];

// Paleta tomada del logo: azul marino #022658 y azul vivo #1279fd
const panelBackground = {
  background:
    "radial-gradient(720px circle at 15% 8%, rgba(18, 121, 253, 0.2), transparent 55%)," +
    "radial-gradient(560px circle at 90% 92%, rgba(18, 121, 253, 0.12), transparent 52%)," +
    "linear-gradient(165deg, #061e46 0%, #04173a 48%, #020a1e 100%)",
};

const gridPattern = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)," +
    "linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
  maskImage: "radial-gradient(ellipse 85% 70% at 50% 38%, black 25%, transparent 78%)",
  WebkitMaskImage: "radial-gradient(ellipse 85% 70% at 50% 38%, black 25%, transparent 78%)",
};

export function AuthBrandPanel() {
  return (
    <div
      className="relative order-2 hidden h-full flex-col justify-between overflow-hidden rounded-3xl p-10 lg:flex"
      style={panelBackground}
    >
      {/* Filo interior sutil */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-[#1279fd]/20 ring-inset" />

      {/* Retícula de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0" style={gridPattern} />

      {/* Marca de agua con el hexágono del logo */}
      <Image
        aria-hidden
        src="/logo-cj-icon.png"
        alt=""
        width={288}
        height={290}
        className="pointer-events-none absolute -right-20 -bottom-20 size-72 rotate-12 opacity-[0.07]"
      />

      {/* Orbes azules de fondo */}
      <motion.div
        aria-hidden
        animate={{ y: [0, -24, 0], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="pointer-events-none absolute top-1/4 right-16 h-40 w-40 rounded-full bg-[#1279fd]/15 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute bottom-1/4 left-10 h-52 w-52 rounded-full bg-[#1279fd]/10 blur-3xl"
      />

      {/* Marca */}
      <div className="relative z-10 flex items-center gap-4">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_8px_30px_rgba(18,121,253,0.35)] ring-1 ring-white/60"
        >
          <Image src="/logo-cj-icon.png" alt={APP_CONFIG.name} width={40} height={40} className="size-9" priority />
        </motion.div>
        <div className="space-y-0.5">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-semibold text-3xl text-white tracking-tight"
          >
            {APP_CONFIG.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-sm text-[#9ec7ff]/90 text-sm"
          >
            Gestión legal clara, segura y profesional.
          </motion.p>
        </div>
      </div>

      {/* Ilustración central */}
      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <div className="relative flex size-64 items-center justify-center">
          {/* Anillo giratorio punteado */}
          <motion.div
            aria-hidden
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-[#1279fd]/30 border-dashed"
          />
          <motion.div
            aria-hidden
            animate={{ rotate: -360 }}
            transition={{ duration: 55, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-6 rounded-full border border-white/5"
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
            className="relative flex size-36 items-center justify-center rounded-full bg-linear-to-b from-white via-[#f4f8ff] to-[#dce9ff] shadow-[0_0_70px_rgba(18,121,253,0.4),inset_0_-10px_24px_rgba(18,121,253,0.12)] ring-1 ring-white/70"
          >
            <Image
              src="/logo-cj-icon.png"
              alt=""
              width={88}
              height={89}
              className="size-[5.5rem] drop-shadow-sm"
              priority
            />
          </motion.div>

          {/* Tarjetas flotantes tipo vidrio */}
          {orbitCards.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
              transition={{
                opacity: { duration: 0.5, delay: 0.6 + card.delay * 0.2 },
                scale: { duration: 0.5, delay: 0.6 + card.delay * 0.2 },
                y: { duration: 4 + card.delay, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: card.delay },
              }}
              className={`absolute flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 shadow-[0_8px_24px_rgba(2,10,30,0.35)] backdrop-blur-md ${card.className}`}
            >
              <card.icon className="size-4 text-[#6fb0ff]" />
              <span className="font-medium text-white text-xs">{card.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sellos de confianza */}
      <div className="relative z-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-white/10 border-t pt-6">
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
  );
}
