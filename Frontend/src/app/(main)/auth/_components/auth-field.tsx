"use client";

import * as React from "react";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthFieldProps = Omit<React.ComponentProps<"input">, "placeholder"> & {
  readonly label: string;
  readonly error?: string;
};

/**
 * Campo de una sola línea con etiqueta flotante y subrayado animado.
 * Si el tipo es "password" añade el botón para mostrar/ocultar el texto.
 */
export function AuthField({ label, error, className, id, type = "text", disabled, ...props }: AuthFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const esPassword = type === "password";
  const invalido = Boolean(error);

  return (
    <div>
      {/* El contenedor relativo llega solo hasta el borde del campo: así la */}
      {/* etiqueta y el subrayado se posicionan sobre él y no sobre el error. */}
      <div className="relative pt-5">
        <input
          {...props}
          id={id}
          type={esPassword && visible ? "text" : type}
          disabled={disabled}
          placeholder=" "
          aria-invalid={invalido}
          aria-describedby={invalido && id ? `${id}-error` : undefined}
          className={cn(
            "auth-field-input peer h-9 w-full border-0 border-[#dbe3ee] border-b bg-transparent pb-1 text-[#0b1d3a] text-[15px] outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            esPassword && "pr-9",
            invalido && "border-[#e11d48]",
            className,
          )}
        />
        <label htmlFor={id} className="auth-field-label">
          {label}
        </label>
        <span
          aria-hidden
          className={cn(
            "auth-field-underline pointer-events-none absolute right-0 bottom-0 left-0 h-[2px] rounded-full",
            invalido ? "bg-[#e11d48]" : "bg-linear-to-r from-[#1279fd] to-[#022658]",
          )}
        />

        {esPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-0 bottom-2 text-[#9aabc0] transition-colors hover:text-[#1279fd] disabled:pointer-events-none disabled:opacity-50"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>

      <p
        id={id ? `${id}-error` : undefined}
        className={cn(
          "min-h-[1.15rem] pt-1.5 text-[11px] text-[#e11d48] leading-tight transition-opacity duration-200",
          invalido ? "opacity-100" : "opacity-0",
        )}
      >
        {error ?? ""}
      </p>
    </div>
  );
}
