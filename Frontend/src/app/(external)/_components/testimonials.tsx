"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { FadeUp } from "./fade-up";

const testimonials = [
  {
    name: "Jorge Molina",
    role: "Empresario",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    rating: 5,
    quote:
      "Más que un estudio jurídico, es un aliado estratégico. Llevaron el proceso de mi empresa con un orden impecable: cada documento, cada plazo y cada audiencia bajo control.",
  },
  {
    name: "Amara Salvatierra",
    role: "Gerente de recursos humanos",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    rating: 5,
    quote: "Resolvieron un conflicto laboral complejo en tiempo récord. La comunicación fue clara desde el primer día.",
  },
  {
    name: "Ricardo Terrazas",
    role: "Comerciante",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    rating: 5,
    quote:
      "Podía ver el avance de mi caso desde el celular y recibía recordatorios de cada cita. Nunca había tenido un servicio legal tan transparente.",
  },
  {
    name: "Claudia Barrientos",
    role: "Emprendedora",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    rating: 5,
    quote:
      "Dudaba si valía la pena una asesoría mensual. Hoy todos los contratos de mi negocio pasan por ellos antes de firmarse. La tranquilidad no tiene precio.",
  },
  {
    name: "Martín Vaca",
    role: "Abogado independiente",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    rating: 5,
    quote:
      "Como colega, reconozco la calidad cuando la veo. Su metodología de trabajo y su plataforma de gestión de casos están a otro nivel.",
  },
  {
    name: "Priya Quiroga",
    role: "Médica residente",
    image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&q=80",
    rating: 5,
    quote:
      "Con mis turnos era imposible ir a un despacho. Las asesorías virtuales y la atención por WhatsApp me solucionaron la vida.",
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="mb-3 flex gap-0.5">
      {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
        <Star key={n} size={12} className="text-[#d4af37]" fill="#d4af37" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section id="testimonios" className="lj-section bg-[#081020]">
      <div className="lj-container">
        <div className="mb-16 text-center">
          <FadeUp>
            <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
              Testimonios
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="lj-font-heading font-black text-3xl text-white uppercase sm:text-4xl md:text-5xl">
              Lo que dicen
              <br />
              <span className="text-[#d4af37]">nuestros clientes</span>
            </h2>
          </FadeUp>
        </div>

        {/* Cuadrícula tipo mosaico */}
        <div className="columns-1 gap-6 space-y-6 md:columns-2 lg:columns-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group break-inside-avoid rounded-2xl border border-[#16233d] bg-[#0f1c33] p-6 hover:border-[#d4af37]/20"
            >
              <StarRating count={t.rating} />
              <p className="mb-6 text-sm text-white/70 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#d4af37]/20">
                  <Image src={t.image} alt={t.name} fill className="object-cover" sizes="40px" />
                </div>
                <div>
                  <p className="lj-font-heading font-bold text-sm text-white">{t.name}</p>
                  <p className="text-white/40 text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
