"use client";

import { motion } from "framer-motion";

/** Círculos de marca que asoman por detrás de la tarjeta, como acento gráfico. */
const circulos = [
  {
    clase: "-left-28 -top-24 size-72 md:-left-32 md:size-80",
    fondo: "linear-gradient(145deg, #3aa0ff 0%, #1279fd 55%, #0b5ed7 100%)",
    sombra: "0 24px 60px -18px rgba(18, 121, 253, 0.55)",
    flotacion: 14,
    duracion: 9,
    retraso: 0.15,
  },
  {
    clase: "-top-20 left-[46%] size-32 md:size-36",
    fondo: "linear-gradient(150deg, #ffc861 0%, #f0a531 60%, #dd8b17 100%)",
    sombra: "0 18px 44px -14px rgba(221, 139, 23, 0.5)",
    flotacion: -11,
    duracion: 7.5,
    retraso: 0.3,
  },
  {
    clase: "-bottom-24 left-[26%] size-60 md:size-64",
    fondo: "linear-gradient(160deg, #0a3f8f 0%, #022658 65%, #01142f 100%)",
    sombra: "0 24px 60px -18px rgba(2, 38, 88, 0.55)",
    flotacion: 12,
    duracion: 10.5,
    retraso: 0.45,
  },
] as const;

export function AuthDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {circulos.map((circulo) => (
        <motion.span
          key={circulo.clase}
          initial={{ opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1, y: [0, circulo.flotacion, 0] }}
          transition={{
            opacity: { duration: 0.8, delay: circulo.retraso, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 0.8, delay: circulo.retraso, ease: [0.16, 1, 0.3, 1] },
            y: {
              duration: circulo.duracion,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: circulo.retraso,
            },
          }}
          className={`absolute rounded-full ${circulo.clase}`}
          style={{ background: circulo.fondo, boxShadow: circulo.sombra }}
        />
      ))}
    </div>
  );
}
