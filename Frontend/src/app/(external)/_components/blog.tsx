"use client";

import Image from "next/image";

import { motion } from "framer-motion";
import { ArrowUpRight, Clock } from "lucide-react";

import { FadeUp } from "./fade-up";

const articles = [
  {
    image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&q=85",
    category: "Contratos",
    readTime: "6 min de lectura",
    title: "Contratos claros: 5 cláusulas que nunca debe firmar sin leer",
    excerpt:
      "Las cláusulas de penalidad, rescisión y garantías esconden los mayores riesgos. Le explicamos cómo detectarlas antes de firmar.",
    date: "10 Jun 2026",
    author: "Dra. Valeria Rojas",
  },
  {
    image: "https://images.unsplash.com/photo-1436450412740-6b988f486c6b?w=800&q=85",
    category: "Laboral",
    readTime: "8 min de lectura",
    title: "Despido injustificado: sus derechos y los plazos para reclamar",
    excerpt:
      "Beneficios sociales, desahucio e indemnización: lo que todo trabajador debe saber antes de firmar su finiquito.",
    date: "28 May 2026",
    author: "Dr. Marco Antelo",
  },
  {
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=85",
    category: "Familia",
    readTime: "5 min de lectura",
    title: "Asistencia familiar: requisitos y procedimiento paso a paso",
    excerpt:
      "Una guía práctica para solicitar, modificar o hacer cumplir la asistencia familiar, con los documentos que necesitará.",
    date: "15 May 2026",
    author: "Dra. Carla Méndez",
  },
];

export function Blog() {
  return (
    <section className="lj-section bg-[#0b1628]">
      <div className="lj-container">
        {/* Encabezado */}
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <FadeUp>
              <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
                Recursos legales
              </span>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="lj-font-heading font-black text-5xl text-white uppercase">
                Guías y artículos
                <br />
                <span className="text-[#d4af37]">para decidir mejor</span>
              </h2>
            </FadeUp>
          </div>
          <FadeUp delay={0.2}>
            <motion.a
              href="#contacto"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="lj-font-heading inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 px-6 py-3 font-bold text-[#d4af37] text-sm uppercase tracking-wider transition-colors hover:bg-[#d4af37]/10"
            >
              Ver todos los artículos <ArrowUpRight size={14} />
            </motion.a>
          </FadeUp>
        </div>

        {/* Cuadrícula de artículos */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {articles.map((article, i) => (
            <motion.article
              key={article.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              {/* Imagen */}
              <div className="relative mb-5 h-56 overflow-hidden rounded-2xl">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#081020]/60 to-transparent" />
                {/* Categoría */}
                <div className="absolute top-4 left-4">
                  <span className="rounded-full bg-[#d4af37] px-3 py-1 font-black text-[#081020] text-[10px] uppercase tracking-widest">
                    {article.category}
                  </span>
                </div>
              </div>

              {/* Datos */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex items-center gap-1 text-white/40 text-xs">
                  <Clock size={10} />
                  <span>{article.readTime}</span>
                </div>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/40 text-xs">{article.date}</span>
              </div>

              {/* Título */}
              <h3 className="lj-font-heading mb-3 font-black text-white text-xl uppercase leading-tight transition-colors duration-300 group-hover:text-[#d4af37]">
                {article.title}
              </h3>

              <p className="mb-4 line-clamp-2 text-sm text-white/50 leading-relaxed">{article.excerpt}</p>

              {/* Autor y flecha */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/40 text-xs">{article.author}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2b3d63] text-white/30 transition-all duration-300 group-hover:border-[#d4af37] group-hover:text-[#d4af37]">
                  <ArrowUpRight size={13} />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
