"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";

import { LOGIN_URL, whatsappMessageLink } from "./landing-config";
import { WhatsappIcon } from "./whatsapp-button";

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
  const reducirMovimiento = useReducedMotion();

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

  // Con el menú abierto: bloquea el scroll del fondo, cierra con Escape
  // y se descarta solo si el viewport pasa a escritorio.
  useEffect(() => {
    if (!mobileOpen) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const escritorio = window.matchMedia("(min-width: 768px)");
    const onEscritorio = () => {
      if (escritorio.matches) setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    escritorio.addEventListener("change", onEscritorio);
    return () => {
      document.body.style.overflow = overflowPrevio;
      window.removeEventListener("keydown", onKeyDown);
      escritorio.removeEventListener("change", onEscritorio);
    };
  }, [mobileOpen]);

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
                          isActive
                            ? "w-[calc(100%-2rem)] opacity-100"
                            : "w-0 opacity-0 group-hover:w-[calc(100%-2rem)] group-hover:opacity-100"
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
                <ArrowRight
                  size={16}
                  className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
                />
              </motion.a>
            </div>

            {/* Botón de menú móvil */}
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur-sm transition-colors duration-200 hover:border-[#d4af37]/50 hover:text-[#d4af37] md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={mobileOpen}
              aria-controls="lj-menu-movil"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Menú móvil a pantalla completa */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="lj-menu-movil"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            initial={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducirMovimiento ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-0 z-[70] overflow-y-auto bg-[#081020] md:hidden"
          >
            {/* Fondo: degradado profundo, resplandores dorados y marca de agua */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-b from-[#0b1628] via-[#081020] to-[#060c1a]" />
              <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[#d4af37]/10 blur-[110px]" />
              <div className="absolute bottom-24 -left-24 h-64 w-64 rounded-full bg-[#d4af37]/5 blur-[100px]" />
              <span className="lj-font-heading absolute -bottom-8 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-black text-[9rem] text-white/2.5 uppercase leading-none tracking-tighter">
                Jurídico
              </span>
            </div>

            <div className="relative flex min-h-full flex-col">
              {/* Cabecera del menú: mismo alto que la barra para una transición perfecta */}
              <motion.div
                initial={reducirMovimiento ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="lj-container w-full"
              >
                <div className="flex h-20 items-center justify-between">
                  <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                    <Image
                      width={340}
                      height={72}
                      className="h-9 w-auto"
                      src="/assets/landing/logo.svg"
                      alt="Consultor Jurídico"
                    />
                  </Link>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors duration-200 hover:border-[#d4af37]/60 hover:text-[#d4af37]"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Cerrar menú"
                  >
                    <X size={20} />
                  </button>
                </div>
              </motion.div>

              {/* Enlaces editoriales numerados */}
              <nav className="lj-container flex w-full flex-1 flex-col justify-center py-6">
                <motion.p
                  initial={reducirMovimiento ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="mb-3 font-semibold text-[10px] text-white/30 uppercase tracking-[0.35em]"
                >
                  Navegación
                </motion.p>
                <ul className="border-white/5 border-t">
                  {navLinks.map((link, i) => {
                    const isActive = active === link.id;
                    return (
                      <motion.li
                        key={link.label}
                        initial={reducirMovimiento ? false : { opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.12 + i * 0.055, ease: [0.16, 1, 0.3, 1] }}
                        className="border-white/5 border-b"
                      >
                        <Link
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={isActive ? "true" : undefined}
                          className="group flex items-center justify-between gap-4 py-4 active:bg-white/2"
                        >
                          <span className="flex items-baseline gap-4">
                            <span
                              className={`font-semibold text-[11px] tracking-[0.2em] ${
                                isActive ? "text-[#d4af37]" : "text-white/30"
                              }`}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={`lj-font-heading font-black text-[1.75rem] uppercase leading-tight tracking-wide transition-colors duration-200 ${
                                isActive ? "text-[#d4af37]" : "text-white group-active:text-[#e2c04d]"
                              }`}
                            >
                              {link.label}
                            </span>
                          </span>
                          <ArrowRight
                            size={18}
                            className={`shrink-0 transition-transform duration-200 group-active:translate-x-1 ${
                              isActive ? "text-[#d4af37]" : "text-white/20"
                            }`}
                          />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* Acciones y cierre del menú (con espacio para el gesto de inicio del iPhone) */}
              <motion.div
                initial={reducirMovimiento ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
                className="lj-container w-full pb-[max(1.75rem,env(safe-area-inset-bottom))]"
              >
                <div className="mb-6 h-px w-full bg-linear-to-r from-[#d4af37]/40 via-white/10 to-transparent" />
                <a
                  href={LOGIN_URL}
                  onClick={() => setMobileOpen(false)}
                  className="lj-btn-shine lj-font-heading relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-linear-to-b from-[#e2c04d] to-[#c9a233] px-6 py-4 font-black text-[#081020] text-sm uppercase tracking-wider shadow-[0_8px_30px_rgba(212,175,55,0.28)]"
                >
                  Ingresar al sistema
                  <ArrowRight size={16} />
                </a>
                <a
                  href={whatsappMessageLink("Hola, deseo solicitar una asesoría jurídica.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileOpen(false)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-4 font-semibold text-sm text-white/85 transition-colors duration-200 hover:border-[#25d366]/60 hover:text-[#25d366]"
                >
                  <WhatsappIcon size={16} />
                  Escribir por WhatsApp
                </a>
                <p className="mt-6 text-center font-medium text-[10px] text-white/30 uppercase tracking-[0.3em]">
                  Excelencia jurídica a su servicio
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
