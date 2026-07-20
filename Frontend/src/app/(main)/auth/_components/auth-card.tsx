"use client";

import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";

import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";
import { cn } from "@/lib/utils";

/** Tarjeta blanca flotante que contiene el formulario de acceso. */
export function AuthCard({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-white shadow-[0_36px_90px_-24px_rgba(2,38,88,0.45)] ring-1 ring-[#022658]/8",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/** Encabezado de la tarjeta: logo, título y bajada. */
export function AuthCardHeader({ title, subtitle }: { readonly title: string; readonly subtitle: string }) {
  return (
    <div className="space-y-5">
      <Image src="/logo-cj-full.png" alt={APP_CONFIG.name} width={230} height={50} priority className="h-8 w-auto" />
      <div className="space-y-1.5">
        <h1 className="font-semibold text-[#1279fd] text-2xl uppercase tracking-[0.22em]">{title}</h1>
        <p className="text-[#6b8099] text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

/** Enlace centrado que devuelve a la página pública de inicio. */
export function AuthBackHomeLink({ className }: { readonly className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      <Link
        prefetch={false}
        href="/"
        className="group inline-flex items-center gap-2 font-semibold text-[#1279fd] text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 hover:text-[#022658]"
      >
        <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        Volver al inicio
      </Link>
    </div>
  );
}

/**
 * Barra inferior a dos colores: enlace secundario a la izquierda y
 * botón de envío del formulario a la derecha.
 */
export function AuthCardActions({
  secondaryHref,
  secondaryLabel,
  submitLabel,
  loadingLabel,
  loading,
}: {
  readonly secondaryHref: string;
  readonly secondaryLabel: string;
  readonly submitLabel: string;
  readonly loadingLabel: string;
  readonly loading: boolean;
}) {
  return (
    <div className="mt-8 grid grid-cols-[0.85fr_1.15fr] border-[#eaeff6] border-t">
      <Link
        prefetch={false}
        href={secondaryHref}
        className="flex items-center justify-center bg-[#f4f7fb] px-4 py-5 text-center font-semibold text-[#5c7899] text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 hover:bg-[#e9eff7] hover:text-[#022658]"
      >
        {secondaryLabel}
      </Link>
      <button
        type="submit"
        disabled={loading}
        className="group relative flex items-center justify-center gap-2 overflow-hidden bg-linear-to-r from-[#1279fd] to-[#0b5ed7] px-4 py-5 font-semibold text-[11px] text-white uppercase tracking-[0.18em] transition-all duration-300 hover:from-[#2f8bff] hover:to-[#0d68ea] disabled:cursor-not-allowed disabled:opacity-75"
      >
        {/* Destello que cruza el botón al pasar el cursor */}
        <span
          aria-hidden
          className="-translate-x-full pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {loadingLabel}
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
