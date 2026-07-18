"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

import { FadeUp, SlideIn } from "./fade-up";

const testimonials = [
  {
    name: "Dra. Valeria Rojas",
    role: "Abogada civilista",
    quote: "Con Consultor Jurídico organizo expedientes y plazos en minutos. Mi estudio gana horas cada semana.",
  },
  {
    name: "Dr. Marco Antelo",
    role: "Consultor corporativo",
    quote: "El seguimiento de casos y los reportes son impecables. Mis clientes lo notan.",
  },
];

const featurePills = [
  "Gestión de casos jurídicos",
  "Documentos legales",
  "Citas y asesorías",
  "Seguridad de la información",
];

export function About() {
  return (
    <section id="nosotros" className="lj-section overflow-hidden bg-[#081020]">
      <div className="lj-container">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
          {/* Izquierda: imagen */}
          <SlideIn direction="left" className="lg:col-span-5">
            <div className="relative">
              <div className="relative h-[600px] overflow-hidden rounded-2xl lg:h-[700px]">
                <Image
                  src="https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=900&q=85"
                  alt="Estatua de la justicia en despacho jurídico"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#081020]/60 to-transparent" />
              </div>
              {/* Recuadro flotante */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="absolute -right-6 -bottom-6 rounded-xl bg-[#d4af37] px-6 py-5"
              >
                <p className="lj-font-heading font-black text-4xl text-[#081020] leading-none">15+</p>
                <p className="mt-1 font-semibold text-[#081020]/70 text-xs uppercase tracking-widest">
                  Años de
                  <br />
                  trayectoria
                </p>
              </motion.div>
            </div>
          </SlideIn>

          {/* Derecha: contenido */}
          <div className="lg:col-span-7 lg:pl-8">
            <FadeUp delay={0.1}>
              <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
                Nuestra firma
              </span>
            </FadeUp>

            <FadeUp delay={0.2}>
              <h2 className="lj-font-heading mb-6 font-black text-5xl text-white uppercase leading-[0.95] tracking-tight md:text-6xl">
                Creado para
                <br />
                <span className="text-[#d4af37]">proteger,</span>
                <br />
                no para complicar.
              </h2>
            </FadeUp>

            <FadeUp delay={0.3}>
              <p className="mb-4 max-w-lg text-base text-white/60 leading-relaxed">
                Consultor Jurídico nace de una convicción clara: un buen resultado legal exige orden, método y
                tecnología. Por eso unimos la experiencia de abogados y consultores con una plataforma que centraliza
                clientes, casos, documentos y citas en un solo lugar.
              </p>
              <p className="mb-10 max-w-lg text-base text-white/60 leading-relaxed">
                Sin improvisaciones y sin papeles perdidos. Solo procesos claros, información protegida y un equipo
                comprometido con la defensa de sus intereses.
              </p>
            </FadeUp>

            {/* Distintivos */}
            <FadeUp delay={0.4}>
              <div className="mb-10 flex flex-wrap gap-3">
                {featurePills.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/5 px-4 py-2 font-medium text-white/70 text-xs tracking-wide"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </FadeUp>

            {/* Mini testimonios */}
            <FadeUp delay={0.5}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {testimonials.map((t) => (
                  <div
                    key={t.name}
                    className="rounded-xl border border-[#1c2a47] bg-[#0f1c33] p-5 transition-colors duration-300 hover:border-[#d4af37]/20"
                  >
                    <Quote size={18} className="mb-3 text-[#d4af37]" />
                    <p className="mb-3 text-sm text-white/70 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d4af37]/20">
                        <span className="font-bold text-[#d4af37] text-xs">
                          {t.name.charAt(t.name.indexOf(".") + 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-white text-xs">{t.name}</p>
                        <p className="text-white/40 text-xs">{t.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
}
