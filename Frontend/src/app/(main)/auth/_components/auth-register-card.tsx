"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { AuthBackHomeLink, AuthCard, AuthCardActions, AuthCardHeader } from "./auth-card";
import { AuthField } from "./auth-field";
import { GoogleButton } from "./social-auth/google-button";
import { useRegisterSubmit } from "./use-auth-submit";

const formSchema = z
  .object({
    nombre: z.string().min(2, { message: "Ingresa tu nombre." }),
    email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
    password: z.string().min(10, { message: "La contraseña debe tener al menos 10 caracteres." }),
    confirmPassword: z.string().min(10, { message: "Confirma la contraseña con al menos 10 caracteres." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export function AuthRegisterCard() {
  const enviarRegistro = useRegisterSubmit();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: "", email: "", password: "", confirmPassword: "" },
  });

  const enviando = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(enviarRegistro)}>
      <AuthCard>
        <div className="px-8 pt-9 sm:px-10">
          <AuthCardHeader title="Crear cuenta" subtitle="Regístrate en menos de un minuto." />

          <div className="mt-7 space-y-2">
            <Controller
              control={form.control}
              name="nombre"
              render={({ field, fieldState }) => (
                <AuthField
                  {...field}
                  id="register-nombre"
                  type="text"
                  label="Nombre completo"
                  autoComplete="name"
                  disabled={enviando}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <AuthField
                  {...field}
                  id="register-email"
                  type="email"
                  label="Correo electrónico"
                  autoComplete="email"
                  disabled={enviando}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <AuthField
                  {...field}
                  id="register-password"
                  type="password"
                  label="Contraseña"
                  autoComplete="new-password"
                  disabled={enviando}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="confirmPassword"
              render={({ field, fieldState }) => (
                <AuthField
                  {...field}
                  id="register-confirm-password"
                  type="password"
                  label="Confirmar contraseña"
                  autoComplete="new-password"
                  disabled={enviando}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>

          <AuthBackHomeLink className="mt-4" />

          <div className="mt-5 space-y-4">
            <div className="relative text-center">
              <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-[#eaeff6]" />
              <span className="relative bg-white px-3 text-[#9aabc0] text-[11px] uppercase tracking-[0.18em]">
                O regístrate con
              </span>
            </div>
            {/* La tarjeta siempre es blanca: el botón no debe seguir el tema oscuro. */}
            <GoogleButton className="w-full [&>button]:border-[#e3e9f2] [&>button]:bg-white [&>button]:text-[#0b1d3a] [&>button]:hover:bg-[#f7f9fc] [&>button]:hover:text-[#0b1d3a]" />
          </div>
        </div>

        <AuthCardActions
          secondaryHref="login"
          secondaryLabel="Ya tengo cuenta"
          submitLabel="Registrarme"
          loadingLabel="Creando cuenta…"
          loading={enviando}
        />
      </AuthCard>
    </form>
  );
}
