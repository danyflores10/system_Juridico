"use client";

import { motion } from "framer-motion";

import { AnimatedCounter } from "./animated-counter";
import { FadeUp } from "./fade-up";

const stats = [
  { value: 1250, suffix: "+", label: "Casos gestionados", description: "Civil, penal, laboral y más" },
  { value: 98, suffix: "%", label: "Clientes satisfechos", description: "Atención cercana y profesional" },
  { value: 25, suffix: "+", label: "Profesionales", description: "Abogados y consultores expertos" },
  { value: 15, suffix: "+", label: "Años de experiencia", description: "Trayectoria comprobada" },
  { value: 350, suffix: "+", label: "Consultas mensuales", description: "Presenciales y virtuales" },
  { value: 5000, suffix: "+", label: "Documentos protegidos", description: "Resguardo digital seguro" },
];

export function Stats() {
  return (
    <section className="lj-section relative overflow-hidden border-[#16233d] border-y bg-[#0b1628]">
      {/* Texto de fondo */}
      <div
        className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden"
        aria-hidden
      >
        <span className="lj-font-heading font-black text-[18vw] text-white/2 uppercase leading-none tracking-tighter">
          Resultados
        </span>
      </div>

      <div className="lj-container relative z-10">
        <div className="mb-10 text-center md:mb-16">
          <FadeUp>
            <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
              Cifras que respaldan
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="lj-font-heading font-black text-3xl text-white uppercase sm:text-4xl md:text-5xl">
              Resultados
              <br />
              <span className="text-[#d4af37]">que hablan por sí solos</span>
            </h2>
          </FadeUp>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[#16233d] bg-[#16233d] md:grid-cols-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-[#081020] p-5 transition-colors duration-300 hover:bg-[#0f1c33] sm:p-8 md:p-12"
            >
              <AnimatedCounter
                target={stat.value}
                suffix={stat.suffix}
                duration={2200}
                className="lj-font-heading mb-2 block origin-left font-black text-4xl text-[#d4af37] leading-none transition-transform duration-300 group-hover:scale-105 sm:text-5xl"
              />
              <p className="lj-font-heading mb-1 font-bold text-sm text-white uppercase tracking-wide sm:text-base">
                {stat.label}
              </p>
              <p className="text-white/40 text-xs">{stat.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
