"use client";

import { FadeUp } from "./fade-up";

const practiceAreas = [
  "Derecho Civil",
  "Derecho Penal",
  "Derecho Laboral",
  "Derecho de Familia",
  "Derecho Corporativo",
  "Derecho Tributario",
  "Derecho Constitucional",
  "Derecho Notarial",
  "Contratos",
  "Sucesiones",
];

export function Partners() {
  // La lista se duplica para que la marquesina sea continua; cada copia lleva su propia clave.
  const doubled = [1, 2].flatMap((copy) => practiceAreas.map((area) => ({ area, key: `${area}-${copy}` })));

  return (
    <section className="overflow-hidden border-[#16233d] border-y bg-[#0b1628] py-20">
      <div className="lj-container mb-10">
        <FadeUp className="text-center">
          <span className="font-semibold text-white/60 text-xs uppercase tracking-[0.25em]">
            Especialistas en las principales ramas del derecho
          </span>
        </FadeUp>
      </div>

      {/* Marquesina */}
      <div className="relative">
        {/* Máscaras degradadas */}
        <div className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-32 bg-linear-to-r from-[#0b1628] to-transparent" />
        <div className="pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-32 bg-linear-to-l from-[#0b1628] to-transparent" />

        <div className="lj-marquee mt-10 flex whitespace-nowrap">
          {doubled.map((item) => (
            <div key={item.key} className="mx-10 flex items-center gap-12">
              <div className="group flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-[#d4af37] transition-transform duration-200 group-hover:scale-150" />
                <span className="lj-font-heading font-black text-lg text-white/30 uppercase tracking-widest transition-colors duration-200 group-hover:text-white/70">
                  {item.area}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
