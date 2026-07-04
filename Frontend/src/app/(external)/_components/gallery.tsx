"use client";

import Image from "next/image";

import { motion } from "framer-motion";

import { FadeUp } from "./fade-up";

const practiceAreas = [
  {
    image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700&q=85",
    name: "Derecho Civil",
    result: "Contratos y obligaciones",
    tag: "Civil",
  },
  {
    image: "https://images.unsplash.com/photo-1589578527966-fdac0f44566c?w=700&q=85",
    name: "Derecho Penal",
    result: "Defensa especializada",
    tag: "Penal",
  },
  {
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=700&q=85",
    name: "Derecho Laboral",
    result: "Relaciones de trabajo",
    tag: "Laboral",
  },
  {
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=85",
    name: "Derecho Corporativo",
    result: "Empresas y sociedades",
    tag: "Corporativo",
  },
];

export function Gallery() {
  return (
    <section id="areas" className="lj-section bg-[#081020]">
      <div className="lj-container">
        {/* Encabezado */}
        <div className="mb-16 text-center">
          <FadeUp>
            <span className="mb-4 block font-semibold text-[#d4af37] text-xs uppercase tracking-[0.25em]">
              Áreas de práctica
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="lj-font-heading font-black text-3xl text-white uppercase sm:text-4xl md:text-5xl">
              Nuestras <span className="text-[#d4af37]">especialidades</span>
              <br />
              legales
            </h2>
          </FadeUp>
        </div>

        {/* Cuadrícula tipo mosaico */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Columna 1: alta */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0 }}
            className="group relative col-span-1 row-span-2 cursor-pointer"
          >
            <div className="relative h-[500px] overflow-hidden rounded-xl">
              <Image
                src={practiceAreas[0].image}
                alt={practiceAreas[0].name}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="25vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#081020] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <span className="mb-2 inline-block rounded-full bg-[#d4af37] px-3 py-1 font-black text-[#081020] text-[10px] uppercase tracking-widest">
                  {practiceAreas[0].tag}
                </span>
                <p className="lj-font-heading font-black text-lg text-white leading-tight">{practiceAreas[0].name}</p>
                <p className="font-semibold text-[#d4af37] text-sm">{practiceAreas[0].result}</p>
              </div>
            </div>
          </motion.div>

          {/* Columna 2: dos bajas */}
          <div className="col-span-1 flex flex-col gap-4">
            {[practiceAreas[1], practiceAreas[2]].map((area, i) => (
              <motion.div
                key={area.name}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.15 }}
                className="group relative cursor-pointer"
              >
                <div className="relative h-[238px] overflow-hidden rounded-xl">
                  <Image
                    src={area.image}
                    alt={area.name}
                    fill
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    sizes="25vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#081020] via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-[#d4af37] px-2 py-0.5 font-black text-[#081020] text-[9px] uppercase tracking-widest">
                      {area.tag}
                    </span>
                    <p className="lj-font-heading font-black text-sm text-white leading-tight">{area.name}</p>
                    <p className="font-semibold text-[#d4af37] text-xs">{area.result}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Columnas 3 y 4: panel ancho */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="group relative col-span-2 cursor-pointer"
          >
            <div className="relative h-[500px] overflow-hidden rounded-xl">
              <Image
                src={practiceAreas[3].image}
                alt={practiceAreas[3].name}
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                sizes="50vw"
              />
              <div className="absolute inset-0 bg-linear-to-t from-[#081020] via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <span className="mb-2 inline-block rounded-full bg-[#d4af37] px-3 py-1 font-black text-[#081020] text-[10px] uppercase tracking-widest">
                  {practiceAreas[3].tag}
                </span>
                <p className="lj-font-heading font-black text-2xl text-white leading-tight">{practiceAreas[3].name}</p>
                <p className="font-semibold text-[#d4af37] text-base">{practiceAreas[3].result}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Llamado a la acción */}
        <FadeUp delay={0.2} className="mt-12 text-center">
          <motion.a
            href="#contacto"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="lj-font-heading inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 px-6 py-3 font-bold text-[#d4af37] text-sm uppercase tracking-wider transition-colors duration-200 hover:bg-[#d4af37]/10"
          >
            Solicitar asesoría
            <span>→</span>
          </motion.a>
        </FadeUp>
      </div>
    </section>
  );
}
