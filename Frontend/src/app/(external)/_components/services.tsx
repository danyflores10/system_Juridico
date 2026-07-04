"use client";

import { motion } from "framer-motion";
import { BarChart3, Briefcase, CalendarCheck, FileText, Scale, Users } from "lucide-react";

import { FadeUp } from "./fade-up";

const services = [
  {
    icon: Scale,
    title: "Consultoría Jurídica",
    description:
      "Asesoría legal personalizada para personas y empresas, con análisis del caso y estrategias claras desde la primera reunión.",
    tag: "Esencial",
  },
  {
    icon: Users,
    title: "Gestión de Clientes",
    description:
      "Registre y organice a sus clientes con historial completo: datos, casos asociados, documentos y comunicaciones en un solo lugar.",
    tag: "Clientes",
  },
  {
    icon: Briefcase,
    title: "Gestión de Casos",
    description:
      "Control total de expedientes, plazos procesales, audiencias y actuaciones. Nada se pierde, nada se vence sin aviso.",
    tag: "Destacado",
    highlight: true,
  },
  {
    icon: FileText,
    title: "Documentos Legales",
    description:
      "Elaboración, revisión y resguardo digital de contratos, memoriales y escritos, con control de acceso por usuarios y roles.",
    tag: "Documentos",
  },
  {
    icon: CalendarCheck,
    title: "Citas y Asesorías",
    description:
      "Agenda inteligente de citas y asesorías presenciales o virtuales, con recordatorios para usted y sus clientes.",
    tag: "Agenda",
  },
  {
    icon: BarChart3,
    title: "Reportes e Indicadores",
    description:
      "Reportes ejecutivos del estado de casos, carga de trabajo y resultados, para decidir con información y no con intuición.",
    tag: "Gerencial",
  },
];

export function Services() {
  return (
    <section id="servicios" className="lj-section bg-[#081020]">
      <div className="lj-container">
        {/* Encabezado */}
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <FadeUp>
              <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
                Nuestros servicios
              </span>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="lj-font-heading font-black text-5xl text-white uppercase">
                Soluciones legales
                <br />
                que <span className="text-[#d4af37]">generan confianza</span>
              </h2>
            </FadeUp>
          </div>
          <FadeUp delay={0.2} className="max-w-xs">
            <p className="text-sm text-white/50 leading-relaxed">
              Cada servicio está respaldado por nuestro sistema de gestión: información ordenada, segura y disponible
              cuando la necesita.
            </p>
          </FadeUp>
        </div>

        {/* Cuadrícula */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#16233d] bg-[#16233d] md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ backgroundColor: service.highlight ? "#1a2540" : "#0f1c33" }}
                className={`group relative cursor-default p-8 transition-colors duration-300 ${
                  service.highlight ? "bg-[#0f1c33]" : "bg-[#081020]"
                }`}
              >
                {/* Línea superior de acento */}
                {service.highlight && <div className="absolute top-0 right-0 left-0 h-px bg-[#d4af37]" />}

                {/* Etiqueta */}
                <span
                  className={`mb-6 inline-block rounded-full px-3 py-1 font-semibold text-[10px] uppercase tracking-widest ${
                    service.highlight ? "bg-[#d4af37] text-[#081020]" : "bg-[#16233d] text-white/50"
                  }`}
                >
                  {service.tag}
                </span>

                {/* Ícono */}
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                    service.highlight
                      ? "bg-[#d4af37] group-hover:scale-110"
                      : "bg-[#16233d] group-hover:bg-[#d4af37]/10"
                  }`}
                >
                  <Icon size={22} className={service.highlight ? "text-[#081020]" : "text-[#d4af37]"} />
                </div>

                <h3 className="lj-font-heading mb-3 font-black text-white text-xl uppercase tracking-tight transition-colors duration-300 group-hover:text-[#d4af37]">
                  {service.title}
                </h3>

                <p className="text-sm text-white/50 leading-relaxed">{service.description}</p>

                {/* Flecha */}
                <div className="mt-6 flex items-center gap-1 text-[#d4af37] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="font-semibold text-xs uppercase tracking-wider">Saber más</span>
                  <span className="text-xs">→</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
