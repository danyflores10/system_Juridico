"use client";

import { motion } from "framer-motion";
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
            <h2 className="lj-font-heading font-black text-5xl text-white uppercase">
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
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.highlight
                  ? "bg-[#d4af37] shadow-[0_0_60px_rgba(212,175,55,0.25)]"
                  : "border border-[#1c2a47] bg-[#0f1c33] hover:border-[#2b3d63]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute top-2 right-2">
                  <span className="flex items-center gap-1 rounded-full bg-[#081020] px-4 py-1 font-black text-[#d4af37] text-[10px] uppercase tracking-widest">
                    <Scale size={10} /> Más solicitado
                  </span>
                </div>
              )}

              {/* Nombre del plan */}
              <p
                className={`mb-4 font-black text-xs uppercase tracking-widest ${
                  plan.highlight ? "text-[#081020]/60" : "text-white/40"
                }`}
              >
                {plan.name}
              </p>

              {/* Precio */}
              <div className="mb-4 flex items-end gap-1">
                <span
                  className={`lj-font-heading font-black text-5xl leading-none ${
                    plan.highlight ? "text-[#081020]" : "text-white"
                  }`}
                >
                  Bs {plan.price}
                </span>
                <span className={`mb-2 font-medium text-sm ${plan.highlight ? "text-[#081020]/60" : "text-white/40"}`}>
                  {plan.period}
                </span>
              </div>

              <p className={`mb-8 text-sm leading-relaxed ${plan.highlight ? "text-[#081020]/70" : "text-white/50"}`}>
                {plan.description}
              </p>

              {/* Beneficios */}
              <ul className="mb-10 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        plan.highlight ? "bg-[#081020]" : "bg-[#d4af37]/10"
                      }`}
                    >
                      <Check size={10} className="text-[#d4af37]" />
                    </div>
                    <span className={`text-sm ${plan.highlight ? "text-[#081020]" : "text-white/70"}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Acción */}
              <motion.a
                href="#contacto"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`lj-font-heading w-full rounded-full py-3.5 text-center font-black text-sm uppercase tracking-wider transition-all duration-200 ${
                  plan.highlight
                    ? "bg-[#081020] text-[#d4af37] hover:bg-[#0f1c33]"
                    : "bg-[#d4af37] text-[#081020] hover:bg-[#e2c04d] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                }`}
              >
                {plan.cta}
              </motion.a>
            </motion.div>
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
