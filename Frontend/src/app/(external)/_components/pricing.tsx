"use client";

import { useRef } from "react";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Check, Scale } from "lucide-react";

import { FadeUp } from "./fade-up";

const plans = [
  {
    name: "Consulta",
    price: 150,
    period: "/ consulta",
    description: "Orientación legal puntual para resolver una duda o evaluar su caso.",
    features: [
      "Consulta presencial o virtual (60 min)",
      "Análisis inicial del caso",
      "Orientación legal específica",
      "Revisión de un documento breve",
      "Seguimiento por WhatsApp (7 días)",
    ],
    cta: "Agendar consulta",
    highlight: false,
  },
  {
    name: "Profesional",
    price: 490,
    period: "/ mes",
    description: "Acompañamiento legal continuo para personas y emprendimientos.",
    features: [
      "Consultas ilimitadas del titular",
      "Gestión de casos activos",
      "Elaboración y revisión de documentos",
      "Citas y asesorías con recordatorios",
      "Acceso al portal del cliente",
      "Reportes del estado de sus casos",
      "Atención prioritaria",
    ],
    cta: "Solicitar este plan",
    highlight: true,
  },
  {
    name: "Corporativo",
    price: 1200,
    period: "/ mes",
    description: "Un departamento legal externo completo para su empresa.",
    features: [
      "Todo lo del plan Profesional",
      "Múltiples usuarios con roles",
      "Gestión documental corporativa",
      "Reportes ejecutivos mensuales",
      "Capacitaciones a su equipo (2/mes)",
      "Abogado asignado dedicado",
    ],
    cta: "Solicitar propuesta",
    highlight: false,
  },
];

type Plan = (typeof plans)[number];

/** Tarjeta con resplandor que sigue al cursor y brillo dorado en el plan destacado. */
function PricingCard({ plan, index }: { plan: Plan; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, rgba(212, 175, 55, 0.14), transparent 75%)`;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-colors duration-300 ${
        plan.highlight
          ? "border-[#d4af37]/40 bg-[#0f1c33] shadow-[0_0_50px_rgba(212,175,55,0.12)] hover:border-[#d4af37]/70"
          : "border-[#1c2a47] bg-[#0d1830] hover:border-[#2b3d63]"
      }`}
    >
      {/* Resplandor cálido superior del plan destacado (como brasa encendida) */}
      {plan.highlight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{
            background:
              "radial-gradient(120% 90% at 75% 0%, rgba(212, 175, 55, 0.28) 0%, rgba(168, 134, 42, 0.12) 45%, transparent 75%)",
          }}
        />
      )}

      {/* Luz que sigue al cursor */}
      <motion.div
        aria-hidden
        style={{ background: spotlight }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Haz dorado que recorre el borde: fijo en el plan destacado, en hover para el resto */}
      <div
        aria-hidden
        className={`lj-border-beam pointer-events-none absolute inset-0 rounded-2xl ${
          plan.highlight ? "" : "opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        }`}
      />

      {/* Contenido por encima de los efectos */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Nombre del plan */}
        <div className="mb-6 flex items-center justify-between">
          <p className="flex items-center gap-2 font-black text-sm text-white uppercase tracking-widest">
            {plan.name}
          </p>
          {plan.highlight && (
            <span className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1 font-black text-[#d4af37] text-[10px] uppercase tracking-widest">
              <Scale size={10} /> Más solicitado
            </span>
          )}
        </div>

        <p className="mb-6 min-h-10 text-sm text-white/50 leading-relaxed">{plan.description}</p>

        {/* Precio */}
        <div className="mb-8 flex items-start gap-2">
          <span className="lj-font-heading mt-2 font-bold text-[#d4af37] text-xl">Bs</span>
          <span className="lj-font-heading font-black text-5xl text-white leading-none tracking-tight sm:text-6xl">
            {plan.price}
          </span>
          <span className="mt-2 font-medium text-sm text-white/40">{plan.period}</span>
        </div>

        {/* Acción */}
        <motion.a
          href="#contacto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`lj-font-heading mb-8 w-full rounded-xl py-3.5 text-center font-black text-sm uppercase tracking-wider transition-all duration-300 ${
            plan.highlight
              ? "bg-linear-to-b from-[#e2c04d] to-[#c19c30] text-[#081020] shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:shadow-[0_0_36px_rgba(212,175,55,0.55)]"
              : "border border-[#2b3d63] bg-[#111f3b] text-white hover:border-[#d4af37]/50 hover:text-[#d4af37]"
          }`}
        >
          {plan.cta}
        </motion.a>

        {/* Separador */}
        <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-[#2b3d63] to-transparent" />

        {/* Beneficios */}
        <ul className="flex-1 space-y-3.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 transition-colors duration-300 group-hover:border-[#d4af37]/50">
                <Check size={10} className="text-[#d4af37]" />
              </div>
              <span className="text-sm text-white/70">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="planes" className="lj-section bg-[#0b1628]">
      <div className="lj-container">
        {/* Encabezado */}
        <div className="mb-16 text-center">
          <FadeUp>
            <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
              Planes de servicio
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="lj-font-heading font-black text-3xl text-white uppercase sm:text-4xl md:text-5xl">
              Planes a la medida
              <br />
              <span className="text-[#d4af37]">de su necesidad</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-md text-base text-white/50">
              Sin permanencia obligatoria. La primera evaluación de su caso no tiene costo.
            </p>
          </FadeUp>
        </div>

        {/* Tarjetas */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <PricingCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>

        <FadeUp delay={0.3} className="mt-10 text-center">
          <p className="text-white/30 text-xs">
            Precios referenciales en bolivianos (Bs). Los honorarios finales pueden variar según la complejidad del
            caso. Consulte sin compromiso.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
