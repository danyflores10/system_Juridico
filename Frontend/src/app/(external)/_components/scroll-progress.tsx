"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Barra de progreso de lectura fija en la parte superior.
 * Usa un resorte (spring) para que avance con un empuje suave y elástico,
 * con degradado dorado y resplandor acordes a la identidad de la landing.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    mass: 0.6,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed top-0 right-0 left-0 z-[60] h-[3px] origin-left bg-linear-to-r from-[#a8862a] via-[#d4af37] to-[#e2c04d] shadow-[0_0_12px_rgba(212,175,55,0.7),0_0_4px_rgba(226,192,77,0.9)]"
    >
      {/* Punta luminosa que "empuja" la barra */}
      <div className="absolute top-1/2 right-0 h-[7px] w-[7px] -translate-y-1/2 translate-x-1/2 rounded-full bg-[#e2c04d] shadow-[0_0_10px_3px_rgba(226,192,77,0.8)]" />
    </motion.div>
  );
}
