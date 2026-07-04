"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

import { LOGIN_URL } from "./landing-config";

const navLinks = [
  { label: "Inicio", href: "#inicio", id: "inicio" },
  { label: "Nosotros", href: "#nosotros", id: "nosotros" },
  { label: "Servicios", href: "#servicios", id: "servicios" },
  { label: "Planes", href: "#planes", id: "planes" },
  { label: "Contacto", href: "#contacto", id: "contacto" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("inicio");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Resalta el enlace de la sección visible (scroll spy defensivo: solo observa lo que existe)
  useEffect(() => {
    const sections = navLinks.map((link) => document.getElementById(link.id)).filter((el): el is HTMLElement => !!el);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          scrolled
            ? "border-[#d4af37]/15 border-b bg-[#081020]/85 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl"
            : "border-transparent border-b bg-transparent"
        }`}
      >
        <div className="lj-container">
          <div className="flex h-20 items-center justify-between">
            {/* Logotipo */}
            <Link href="/" className="group flex items-center gap-2">
              <Image
                width={340}
                height={72}
                className="h-9 w-auto transition-transform duration-300 group-hover:scale-105"
                src="/assets/landing/logo.svg"
                alt="Consultor Jurídico"
                priority
              />
            </Link>

            {/* Navegación de escritorio */}
            <ul className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const isActive = active === link.id;
                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={`group relative block px-4 py-2 font-medium text-sm uppercase tracking-wide transition-colors duration-300 ${
                        isActive ? "text-[#d4af37]" : "text-white/65 hover:text-white"
                      }`}
                    >
                      {link.label}
                      {/* Subrayado dorado animado */}
                      <span
                        className={`absolute bottom-0.5 left-4 h-px bg-linear-to-r from-[#d4af37] to-[#e2c04d] transition-all duration-300 ease-out ${
                          isActive ? "w-[calc(100%-2rem)] opacity-100" : "w-0 opacity-0 group-hover:w-[calc(100%-2rem)] group-hover:opacity-100"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Acción principal */}
            <div className="hidden items-center gap-4 md:flex">
              <motion.a
                href={LOGIN_URL}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="lj-font-heading group relative flex items-center gap-2 overflow-hidden rounded-full bg-linear-to-b from-[#e2c04d] to-[#c9a233] px-6 py-2.5 font-bold text-[#081020] text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-shadow duration-300 hover:shadow-[0_6px_30px_rgba(212,175,55,0.55)]"
              >
                {/* Barrido de brillo diagonal */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-linear-to-r from-transparent via-white/60 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[220%]" />
                <span className="relative z-10">Ingresar al sistema</span>
                <ArrowRight size={16} className="relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.a>
            </div>

            {/* Menú móvil */}
            <button
              type="button"
              className="p-1 text-white transition-colors hover:text-[#d4af37] md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Abrir menú"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Menú móvil desplegado */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-[#081020] md:hidden"
          >
            <button
              type="button"
              className="absolute top-6 right-6 text-white transition-colors hover:text-[#d4af37]"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X size={28} />
            </button>
            {navLinks.map((link, i) => (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`lj-font-heading font-black text-3xl uppercase tracking-widest transition-colors ${
                    active === link.id ? "text-[#d4af37]" : "text-white hover:text-[#d4af37]"
                  }`}
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: navLinks.length * 0.08 }}
              href={LOGIN_URL}
              onClick={() => setMobileOpen(false)}
              className="lj-font-heading mt-4 flex items-center gap-2 rounded-full bg-linear-to-b from-[#e2c04d] to-[#c9a233] px-8 py-3 font-bold text-[#081020] text-lg uppercase tracking-wider shadow-[0_4px_20px_rgba(212,175,55,0.3)]"
            >
              Ingresar al sistema
              <ArrowRight size={18} />
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
