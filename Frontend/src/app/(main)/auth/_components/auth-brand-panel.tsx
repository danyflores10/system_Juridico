"use client";

import { motion } from "framer-motion";
import { CalendarClock, FileText, FolderKanban, Scale, ShieldCheck, Users } from "lucide-react";

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

const panelBackground = {
  background:
    "radial-gradient(680px circle at 18% 12%, rgba(212, 175, 55, 0.16), transparent 55%)," +
    "radial-gradient(520px circle at 88% 92%, rgba(212, 175, 55, 0.1), transparent 52%)," +
    "linear-gradient(160deg, #0b1628 0%, #081020 58%, #060c18 100%)",
};

export function AuthBrandPanel() {
  return (
    <div
      className="relative order-2 hidden h-full flex-col justify-between overflow-hidden rounded-3xl p-10 lg:flex"
      style={panelBackground}
    >
      {/* Filo dorado interior */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-[#d4af37]/15 ring-inset" />

      {/* Orbes dorados de fondo */}
      <motion.div
        aria-hidden
        animate={{ y: [0, -24, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 9, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        className="pointer-events-none absolute top-1/4 right-16 h-40 w-40 rounded-full bg-[#d4af37]/10 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 11, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1.5 }}
        className="pointer-events-none absolute bottom-1/4 left-10 h-52 w-52 rounded-full bg-[#d4af37]/8 blur-3xl"
      />

      {/* Marca */}
      <div className="relative z-10 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex size-14 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 backdrop-blur-sm"
        >
          <Scale className="size-7 text-[#d4af37]" />
        </motion.div>
        <div className="space-y-1.5">
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
            className="max-w-sm text-[#d4af37]/80 text-sm"
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
            className="absolute inset-0 rounded-full border border-[#d4af37]/20 border-dashed"
          />
          <motion.div
            aria-hidden
            animate={{ rotate: -360 }}
            transition={{ duration: 55, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="absolute inset-6 rounded-full border border-white/5"
          />

          {/* Medallón central con la balanza */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex size-32 items-center justify-center rounded-full border border-[#d4af37]/30 bg-linear-to-b from-[#12203c] to-[#0b1424] shadow-[0_0_50px_rgba(212,175,55,0.25)]"
          >
            <Scale className="size-14 text-[#d4af37]" />
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
              className={`absolute flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-2 backdrop-blur-md ${card.className}`}
            >
              <card.icon className="size-4 text-[#d4af37]" />
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
            <item.icon className="size-4 text-[#d4af37]" />
            <span className="text-sm text-white/60">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
