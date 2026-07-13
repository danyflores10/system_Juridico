"use client";

import { useRef, useState } from "react";

import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { Check, MonitorSmartphone, Scale, ShieldCheck } from "lucide-react";

import { CheckoutDialog } from "./checkout-dialog";
import { FadeUp } from "./fade-up";
import { LOGIN_URL, whatsappMessageLink } from "./landing-config";
import { ahorroPeriodo, type Periodicidad, PLANES, type PlanSuscripcion } from "./planes-data";

const REGISTRO_URL = LOGIN_URL.replace("/login", "/register");

/** Tarjeta con resplandor que sigue al cursor y brillo dorado en el plan destacado. */
function PricingCard({
  plan,
  index,
  onSuscribir,
}: {
  plan: PlanSuscripcion;
  index: number;
  onSuscribir: (plan: PlanSuscripcion, periodicidad: Periodicidad | null) => void;
}) {
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

  const mensual = plan.precios.find((p) => p.periodicidad === "mensual");
  const alternativo = plan.precios.find((p) => p.periodicidad !== "mensual");
  const ahorro = alternativo ? ahorroPeriodo(plan, alternativo) : 0;

  const claseCta = plan.destacado
    ? "bg-linear-to-b from-[#e2c04d] to-[#c19c30] text-[#081020] shadow-[0_0_24px_rgba(212,175,55,0.35)] hover:shadow-[0_0_36px_rgba(212,175,55,0.55)]"
    : "border border-[#2b3d63] bg-[#111f3b] text-white hover:border-[#d4af37]/50 hover:text-[#d4af37]";

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border p-7 transition-colors duration-300 ${
        plan.destacado
          ? "border-[#d4af37]/40 bg-[#0f1c33] pt-12 shadow-[0_0_50px_rgba(212,175,55,0.12)] hover:border-[#d4af37]/70"
          : "border-[#1c2a47] bg-[#0d1830] hover:border-[#2b3d63]"
      }`}
    >
      {/* Cinta superior del plan destacado (centrada, nunca se corta) */}
      {plan.destacado && (
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-b-xl bg-linear-to-b from-[#e2c04d] to-[#c19c30] px-4 py-1.5 font-black text-[#081020] text-[10px] uppercase tracking-[0.2em] shadow-[0_6px_18px_rgba(212,175,55,0.35)]">
            <Scale size={11} /> Más elegido
          </span>
        </div>
      )}

      {/* Resplandor cálido superior del plan destacado */}
      {plan.destacado && (
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

      {/* Haz dorado que recorre el borde */}
      <div
        aria-hidden
        className={`lj-border-beam pointer-events-none absolute inset-0 rounded-2xl ${
          plan.destacado ? "" : "opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        }`}
      />

      {/* Contenido por encima de los efectos */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Nombre del plan + dispositivos */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="font-black text-sm text-white uppercase tracking-widest">{plan.nombre}</p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#2b3d63] bg-[#0b1628] px-2.5 py-1 font-semibold text-[11px] text-white/60">
            <MonitorSmartphone size={12} className="text-[#d4af37]" />
            {plan.dispositivos}
          </span>
        </div>

        <p className="mb-5 min-h-14 text-sm text-white/50 leading-relaxed 2xl:min-h-24">{plan.descripcion}</p>

        {/* Precio */}
        <div className="mb-3 flex min-h-12 items-baseline gap-1.5">
          {plan.tipo === "variable" ? (
            <span className="lj-font-heading font-black text-4xl text-white leading-none tracking-tight">A medida</span>
          ) : (
            <>
              <span className="lj-font-heading font-bold text-[#d4af37] text-lg">Bs</span>
              <span className="lj-font-heading font-black text-5xl text-white leading-none tracking-tight">
                {mensual ? mensual.precio : 0}
              </span>
              <span className="font-medium text-sm text-white/40">
                {plan.tipo === "gratuito" ? "para siempre" : "/ mes"}
              </span>
            </>
          )}
        </div>

        {/* Promoción del período alternativo (semestral / anual) */}
        <div className="mb-6 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1.5">
          {plan.tipo === "variable" && (
            <span className="text-white/45 text-xs">Según el número de dispositivos de su equipo.</span>
          )}
          {alternativo && (
            <>
              <span className="whitespace-nowrap text-white/45 text-xs">
                o <span className="font-semibold text-[#d4af37]">Bs {alternativo.precio}</span>{" "}
                {alternativo.periodicidad === "semestral" ? "al semestre" : "al año"}
              </span>
              {ahorro > 0 && (
                <span className="whitespace-nowrap rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 font-bold text-[#d4af37] text-[10px] uppercase tracking-wide">
                  Ahorras Bs {ahorro}
                </span>
              )}
            </>
          )}
        </div>

        {/* Acción */}
        {plan.tipo === "pago" ? (
          <motion.button
            type="button"
            onClick={() => onSuscribir(plan, mensual ? "mensual" : plan.precios[0].periodicidad)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`lj-font-heading mb-7 w-full rounded-xl py-3.5 text-center font-black text-sm uppercase tracking-wider transition-all duration-300 ${claseCta}`}
          >
            Suscribirme
          </motion.button>
        ) : (
          <motion.a
            href={
              plan.tipo === "gratuito"
                ? REGISTRO_URL
                : whatsappMessageLink(
                    "Hola, deseo una cotización del Plan Empresarial de Consultor Jurídico (N dispositivos).",
                  )
            }
            target={plan.tipo === "variable" ? "_blank" : undefined}
            rel={plan.tipo === "variable" ? "noopener noreferrer" : undefined}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`lj-font-heading mb-7 w-full rounded-xl py-3.5 text-center font-black text-sm uppercase tracking-wider transition-all duration-300 ${claseCta}`}
          >
            {plan.tipo === "gratuito" ? "Crear cuenta gratis" : "Solicitar cotización"}
          </motion.a>
        )}

        {/* Separador */}
        <div className="mb-7 h-px w-full bg-linear-to-r from-transparent via-[#2b3d63] to-transparent" />

        {/* Beneficios */}
        <ul className="flex-1 space-y-3.5">
          {plan.beneficios.map((beneficio) => (
            <li key={beneficio} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 transition-colors duration-300 group-hover:border-[#d4af37]/50">
                <Check size={10} className="text-[#d4af37]" />
              </div>
              <span className="text-sm text-white/70">{beneficio}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function Pricing() {
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanSuscripcion | null>(null);
  const [periodicidadInicial, setPeriodicidadInicial] = useState<Periodicidad | null>(null);

  const abrirCheckout = (plan: PlanSuscripcion, periodicidad: Periodicidad | null) => {
    setPlanSeleccionado(plan);
    setPeriodicidadInicial(periodicidad);
  };

  return (
    <section id="planes" className="lj-section bg-[#0b1628]">
      <div className="lj-container">
        {/* Encabezado */}
        <div className="mb-16 text-center">
          <FadeUp>
            <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
              Planes y promociones
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="lj-font-heading font-black text-3xl text-white uppercase sm:text-4xl md:text-5xl">
              Suscripciones a la
              <br />
              <span className="text-[#d4af37]">Biblioteca Jurídica</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-xl text-base text-white/50">
              Acceso a la Biblioteca Jurídica y a la Biblioteca Doctrinal de autoría propia registrada en SENAPI.
              Suscripción mensual, semestral o anual.
            </p>
          </FadeUp>
        </div>

        {/* Tarjetas */}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {PLANES.map((plan, i) => (
            <PricingCard key={plan.codigo} plan={plan} index={i} onSuscribir={abrirCheckout} />
          ))}
        </div>

        <FadeUp delay={0.3} className="mt-10 text-center">
          <p className="mx-auto flex max-w-2xl items-center justify-center gap-2 text-sm text-white/50">
            <ShieldCheck size={15} className="shrink-0 text-[#d4af37]" />
            Pago seguro con QR, tarjeta o banca en línea a través de Libélula.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-white/30 text-xs">
            Precios en bolivianos (Bs). Importante: cada usuario y contraseña habilita 1 solo dispositivo — quedará
            vinculado al primer equipo en el que inicies sesión y no podrá usarse en otro.
          </p>
        </FadeUp>
      </div>

      {/* Checkout: popup de datos del cliente + facturación opcional */}
      <CheckoutDialog
        plan={planSeleccionado}
        periodicidadInicial={periodicidadInicial}
        onClose={() => setPlanSeleccionado(null)}
      />
    </section>
  );
}
