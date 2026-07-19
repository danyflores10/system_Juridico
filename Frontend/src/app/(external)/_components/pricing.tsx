"use client";

import { useRef, useState } from "react";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { Check, MonitorSmartphone, Scale, ShieldCheck } from "lucide-react";

import { CheckoutDialog } from "./checkout-dialog";
import { FadeUp } from "./fade-up";
import { LOGIN_URL, whatsappMessageLink } from "./landing-config";
import { ahorroPeriodo, type Periodicidad, PLANES, type PlanSuscripcion } from "./planes-data";

const REGISTRO_URL = LOGIN_URL.replace("/login", "/register");

/**
 * Ondas decorativas del encabezado de cada tarjeta (SVG inline local, sin
 * imágenes externas). Trazos finos grises en planes laterales y dorados en
 * el plan destacado.
 */
const WAVE_PATHS: string[] = Array.from(
  { length: 9 },
  (_, i) =>
    `M-20 ${18 + i * 11} C 70 ${58 + i * 7} 150 ${-8 + i * 12} 245 ${40 + i * 9} S 385 ${10 + i * 11} 445 ${46 + i * 9}`,
);

function CardWaves({ gold }: { gold: boolean }) {
  return (
    <svg
      role="none"
      aria-hidden="true"
      viewBox="0 0 420 150"
      preserveAspectRatio="none"
      fill="none"
      className="pointer-events-none absolute inset-x-0 top-0 h-32 w-full"
    >
      {WAVE_PATHS.map((d, i) => (
        <path
          key={d}
          d={d}
          strokeWidth="1"
          stroke={gold ? "#d4af37" : "#aab3c8"}
          strokeOpacity={(gold ? 0.055 : 0.04) + i * (gold ? 0.02 : 0.011)}
        />
      ))}
      <path
        d="M-20 130 C 90 96 200 148 300 108 S 400 128 445 112"
        strokeWidth="1"
        stroke={gold ? "#d4af37" : "#aab3c8"}
        strokeOpacity={gold ? 0.14 : 0.08}
      />
    </svg>
  );
}

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
  const reducirMovimiento = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, rgba(212, 175, 55, 0.12), transparent 75%)`;

  const mensual = plan.precios.find((p) => p.periodicidad === "mensual");
  const alternativo = plan.precios.find((p) => p.periodicidad !== "mensual");
  const ahorro = alternativo ? ahorroPeriodo(plan, alternativo) : 0;

  const claseCta = plan.destacado
    ? "lj-btn-shine bg-[linear-gradient(90deg,#F6C453_0%,#D9922E_55%,#B96824_100%)] text-[#081020] shadow-[0_8px_26px_rgba(232,184,74,0.28)] hover:shadow-[0_10px_34px_rgba(232,184,74,0.45)] focus-visible:outline-[#f6c453]"
    : "border border-white/10 bg-white/[0.04] text-white hover:border-[#d4af37]/50 hover:text-[#e2c04d] focus-visible:outline-[#d4af37]";

  const claseCtaBase =
    "lj-font-heading relative mt-7 w-full cursor-pointer overflow-hidden rounded-xl py-3.5 text-center font-black text-sm uppercase tracking-wider transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2";

  return (
    <motion.div
      initial={reducirMovimiento ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={reducirMovimiento ? undefined : { y: -8, transition: { duration: 0.3 } }}
      onMouseMove={handleMouseMove}
      className={`group relative ${plan.destacado ? "max-lg:order-first lg:my-0" : "lg:my-7"}`}
    >
      {/* Resplandor dorado exterior con respiración lenta (solo plan destacado) */}
      {plan.destacado && (
        <div
          aria-hidden
          className="lj-pricing-breathe pointer-events-none absolute -inset-2 rounded-[32px] bg-[radial-gradient(60%_55%_at_50%_18%,rgba(212,175,55,0.28),rgba(212,175,55,0.08)_55%,transparent_78%)] blur-xl"
        />
      )}

      {/* Insignia sobre el borde superior del plan destacado */}
      {plan.destacado && (
        <div className="absolute inset-x-0 -top-3.5 z-20 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/60 bg-[#0a1122] px-4 py-1.5 font-black text-[#e2c04d] text-[10px] uppercase tracking-[0.22em] shadow-[0_0_18px_rgba(212,175,55,0.35)]">
            <Scale size={11} /> Más elegido
          </span>
        </div>
      )}

      <div
        ref={cardRef}
        className={`relative flex h-full flex-col overflow-hidden rounded-3xl border p-7 pt-10 backdrop-blur-sm transition-colors duration-300 ${
          plan.destacado
            ? "border-[#d4af37]/45 bg-[#0e1830]/95 shadow-[0_18px_50px_rgba(0,0,0,0.5)] group-hover:border-[#d4af37]/75"
            : "border-white/10 bg-[#0c1526]/90 shadow-[0_14px_40px_rgba(0,0,0,0.45)] group-hover:border-white/20"
        }`}
      >
        {/* Ondas decorativas del encabezado */}
        <CardWaves gold={plan.destacado} />

        {/* Iluminación interior cálida del plan destacado */}
        {plan.destacado && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-44"
            style={{
              background:
                "radial-gradient(110% 85% at 50% 0%, rgba(212, 175, 55, 0.16) 0%, rgba(168, 134, 42, 0.06) 50%, transparent 78%)",
            }}
          />
        )}

        {/* Luz que sigue al cursor */}
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {/* Contenido por encima de los efectos */}
        <div className="relative z-10 flex flex-1 flex-col">
          {/* Nombre del plan centrado sobre las ondas */}
          <p
            className={`text-center font-black text-base uppercase tracking-[0.3em] ${
              plan.destacado ? "text-[#e2c04d]" : "text-white"
            }`}
          >
            {plan.nombre}
          </p>

          {/* Dispositivos incluidos */}
          <div className="mt-3 flex justify-center">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#0a1122]/80 px-2.5 py-1 font-semibold text-[11px] text-white/60">
              <MonitorSmartphone size={12} className="text-[#d4af37]" />
              {plan.dispositivos}
            </span>
          </div>

          <p className="mt-5 mb-5 min-h-14 text-center text-sm text-white/50 leading-relaxed 2xl:min-h-24">
            {plan.descripcion}
          </p>

          {/* Precio */}
          <div className="mb-3 flex min-h-12 items-baseline justify-center gap-1.5">
            {plan.tipo === "variable" ? (
              <span className="lj-font-heading font-black text-4xl text-white leading-none tracking-tight">
                A medida
              </span>
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
          <div className="mb-6 flex min-h-6 flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
            {plan.tipo === "variable" && (
              <span className="text-center text-white/45 text-xs">Según el número de dispositivos de su equipo.</span>
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

          {/* Separador */}
          <div
            className={`mb-6 h-px w-full bg-linear-to-r from-transparent to-transparent ${
              plan.destacado ? "via-[#d4af37]/35" : "via-white/15"
            }`}
          />

          {/* Beneficios */}
          <ul className="flex-1 space-y-3.5">
            {plan.beneficios.map((beneficio) => (
              <li key={beneficio} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                    plan.destacado
                      ? "border-[#d4af37]/40 bg-[#d4af37]/10 group-hover:border-[#d4af37]/60"
                      : "border-white/15 bg-white/5 group-hover:border-white/25"
                  }`}
                >
                  <Check size={10} className={plan.destacado ? "text-[#e2c04d]" : "text-white/70"} />
                </div>
                <span className="text-sm text-white/70">{beneficio}</span>
              </li>
            ))}
          </ul>

          {/* Acción (siempre alineada al fondo de la tarjeta) */}
          {plan.tipo === "pago" ? (
            <motion.button
              type="button"
              onClick={() => onSuscribir(plan, mensual ? "mensual" : plan.precios[0].periodicidad)}
              aria-label={`Suscribirme al plan ${plan.nombre}`}
              whileHover={reducirMovimiento ? undefined : { scale: 1.02 }}
              whileTap={reducirMovimiento ? undefined : { scale: 0.98 }}
              className={`${claseCtaBase} ${claseCta}`}
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
              aria-label={
                plan.tipo === "gratuito"
                  ? "Crear cuenta gratis en Consultor Jurídico"
                  : `Solicitar cotización del plan ${plan.nombre}`
              }
              whileHover={reducirMovimiento ? undefined : { scale: 1.02 }}
              whileTap={reducirMovimiento ? undefined : { scale: 0.98 }}
              className={`${claseCtaBase} ${claseCta}`}
            >
              {plan.tipo === "gratuito" ? "Crear cuenta gratis" : "Solicitar cotización"}
            </motion.a>
          )}
        </div>
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
    <section id="planes" className="lj-section relative overflow-hidden bg-[#070d1a]">
      {/* Fondo: resplandor radial superior + iluminación dorada central */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-96 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(148,178,255,0.06),transparent_70%)]" />
        <div className="absolute top-1/2 left-1/2 h-[560px] w-[860px] max-w-full -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(50%_50%_at_50%_50%,rgba(212,175,55,0.07),transparent_72%)]" />
      </div>

      <div className="lj-container relative">
        {/* Encabezado */}
        <div className="mb-10 text-center md:mb-16">
          <FadeUp>
            <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
              Planes y promociones
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="lj-font-heading font-black text-3xl text-white uppercase tracking-[0.06em] sm:text-4xl md:text-5xl">
              Planes simples.
              <br />
              <span className="lj-gradient-gold">Beneficios poderosos.</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
              Elige el plan que mejor se adapte a tus necesidades jurídicas.
            </p>
          </FadeUp>
        </div>

        {/* Tarjetas: el plan destacado sobresale en escritorio y aparece primero en móvil */}
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7 2xl:grid-cols-5">
          {PLANES.map((plan, i) => (
            <PricingCard key={plan.codigo} plan={plan} index={i} onSuscribir={abrirCheckout} />
          ))}
        </div>

        <FadeUp delay={0.3} className="mt-12 text-center">
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
