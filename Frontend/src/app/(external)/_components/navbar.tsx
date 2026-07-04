"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { LOGIN_URL } from "./landing-config";

const navLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Servicios", href: "#servicios" },
  { label: "Planes", href: "#planes" },
  { label: "Contacto", href: "#contacto" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          scrolled ? "bg-[#081020]/90 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="lj-container">
          <div className="flex h-20 items-center justify-between">
            {/* Logotipo */}
            <Link href="/" className="group flex items-center gap-2">
              <Image
                width={340}
                height={72}
                className="h-9 w-auto"
                src="/assets/landing/logo.svg"
                alt="Consultor Jurídico"
                priority
              />
            </Link>

            {/* Navegación de escritorio */}
            <ul className="hidden items-center gap-8 md:flex">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="font-medium text-sm text-white/70 uppercase tracking-wide transition-colors duration-200 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Acción principal */}
            <div className="hidden items-center gap-4 md:flex">
              <motion.a
                href={LOGIN_URL}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="lj-font-heading rounded-full bg-[#d4af37] px-5 py-2.5 font-bold text-[#081020] text-sm uppercase tracking-wider transition-all duration-200 hover:bg-[#e2c04d] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)]"
              >
                Ingresar al sistema
              </motion.a>
            </div>

            {/* Menú móvil */}
            <button
              type="button"
              className="p-1 text-white md:hidden"
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
              className="absolute top-6 right-6 text-white"
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
                  className="lj-font-heading font-black text-3xl text-white uppercase tracking-widest transition-colors hover:text-[#d4af37]"
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
              className="lj-font-heading mt-4 rounded-full bg-[#d4af37] px-8 py-3 font-bold text-[#081020] text-lg uppercase tracking-wider"
            >
              Ingresar al sistema
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
