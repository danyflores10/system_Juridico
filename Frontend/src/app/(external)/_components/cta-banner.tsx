"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { FadeUp } from "./fade-up";
import { WHATSAPP_LINK } from "./landing-config";
import { WhatsappIcon } from "./whatsapp-button";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 md:py-32">
      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=85"
          alt="Oficina legal moderna"
          fill
          className="object-cover object-center opacity-20"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#081020]/70" />
        {/* Acento degradado dorado */}
        <div className="absolute inset-0 bg-linear-to-br from-[#d4af37]/10 via-transparent to-transparent" />
      </div>

      <div className="lj-container relative z-10 text-center">
        <FadeUp>
          <span className="mb-6 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
            Agenda abierta este mes
          </span>
        </FadeUp>

        <FadeUp delay={0.1}>
          <h2 className="lj-font-heading mx-auto mb-8 max-w-4xl font-black text-3xl text-white uppercase sm:text-4xl md:text-6xl">
            Su tranquilidad legal
            <br />
            <span className="text-[#d4af37]">comienza hoy.</span>
          </h2>
        </FadeUp>

        <FadeUp delay={0.2}>
          <p className="mx-auto mb-10 max-w-md text-base text-white/50">
            Agende su primera evaluación sin costo y conozca cómo protegeremos sus intereses. Un equipo de abogados y
            consultores jurídicos está listo para atenderle.
          </p>
        </FadeUp>

        <FadeUp delay={0.3}>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <motion.a
              href="#contacto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lj-font-heading group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d4af37] px-6 py-3.5 font-black text-[#081020] text-base uppercase tracking-wider transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(212,175,55,0.45)] sm:w-auto sm:py-3"
            >
              Solicitar asesoría
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </motion.a>
            <motion.a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="lj-font-heading inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 font-bold text-base text-white uppercase tracking-wider transition-colors duration-200 hover:border-[#25d366]/60 hover:text-[#25d366] sm:w-auto sm:py-3"
            >
              <WhatsappIcon size={18} />
              Contactar por WhatsApp
            </motion.a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
