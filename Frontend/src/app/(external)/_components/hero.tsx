"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { ArrowRight, Scale } from "lucide-react";

import { LOGIN_URL } from "./landing-config";

const heroStats = [
  { value: "15+", label: "Años de experiencia" },
  { value: "1.2K+", label: "Casos gestionados" },
  { value: "98%", label: "Clientes satisfechos" },
];

export function Hero() {
  return (
    <section id="inicio" className="relative flex min-h-screen items-center overflow-hidden bg-[#081020]">
      {/* Imagen de fondo */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=1920&q=90"
          alt="Balanza de la justicia en biblioteca jurídica"
          fill
          priority
          className="object-cover object-center opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#081020] to-transparent" />
      </div>

      <div className="lj-container relative z-10 w-full pt-24 pb-16">
        {/* Distintivo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 mb-8 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-2 backdrop-blur-sm"
        >
          <Scale size={14} className="text-[#d4af37]" />
          <span className="font-medium text-[#d4af37] text-xs uppercase tracking-widest">
            Excelencia jurídica a su servicio
          </span>
        </motion.div>

        {/* Titular principal */}
        <div className="mb-4 overflow-hidden">
          <motion.h1
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="lj-font-heading font-black text-4xl text-white uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Protegemos
          </motion.h1>
        </div>
        <div className="mb-4 overflow-hidden">
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-baseline gap-4"
          >
            <h1 className="lj-font-heading font-black text-4xl text-[#d4af37] uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Sus derechos
            </h1>
          </motion.div>
        </div>
        <div className="mb-10 overflow-hidden">
          <motion.h1
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lj-font-heading font-black text-4xl text-white uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Con excelencia
          </motion.h1>
        </div>

        {/* Texto de apoyo y acciones */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.85 }}
          className="mt-4 flex flex-col gap-6"
        >
          <p className="max-w-md text-base text-white/60 leading-relaxed">
            Consultoría jurídica integral para personas y empresas: gestión de clientes, casos, documentos legales,
            citas y reportes en una sola plataforma segura.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <motion.a
              href={LOGIN_URL}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="lj-font-heading group flex items-center gap-2 rounded-full bg-[#d4af37] px-6 py-3 font-bold text-[#081020] text-sm uppercase tracking-wider transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)]"
            >
              Ingresar al sistema
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </motion.a>
            <motion.a
              href="#servicios"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="lj-font-heading rounded-full border border-white/20 px-6 py-3 font-bold text-sm text-white uppercase tracking-wider transition-colors duration-200 hover:border-white/50"
            >
              Ver servicios
            </motion.a>
          </div>
        </motion.div>

        {/* Cifras destacadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.05 }}
          className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-6 border-white/10 border-t pt-8 sm:gap-x-12 md:mt-16"
        >
          {heroStats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="lj-font-heading font-black text-2xl text-[#d4af37] leading-none sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1 text-white/50 text-xs uppercase tracking-wide">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Indicador de desplazamiento */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute right-8 bottom-8 z-10 hidden flex-col items-center gap-2 md:right-16 md:flex"
      >
        <div className="h-16 w-px bg-linear-to-b from-transparent to-[#d4af37]/60" />
        <span className="origin-center translate-x-4 rotate-90 text-[10px] text-white/40 uppercase tracking-widest">
          Deslizar
        </span>
      </motion.div>
    </section>
  );
}
