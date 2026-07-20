"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Checkbox } from "@/components/ui/checkbox";

import { AuthBackHomeLink, AuthCard, AuthCardActions, AuthCardHeader } from "./auth-card";
import { AuthField } from "./auth-field";
import { GoogleButton } from "./social-auth/google-button";
import { useLoginSubmit } from "./use-auth-submit";

const formSchema = z.object({
  email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  remember: z.boolean().optional(),
});

export function AuthLoginCard() {
  const enviarLogin = useLoginSubmit();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const enviando = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(enviarLogin)}>
      <AuthCard>
        <div className="px-8 pt-9 sm:px-10">
          <AuthCardHeader title="Iniciar sesión" subtitle="Ingresa tus datos para entrar al sistema." />

          <div className="mt-7 space-y-2">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <AuthField
                  {...field}
                  id="login-email"
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
                  id="login-password"
                  type="password"
                  label="Contraseña"
                  autoComplete="current-password"
                  disabled={enviando}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <div className="mt-3 flex items-center gap-2.5">
                <Checkbox
                  id="login-remember"
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  disabled={enviando}
                  className="border-[#cbd7e6] data-checked:border-[#1279fd] data-checked:bg-[#1279fd] data-checked:text-white"
                />
                <label htmlFor="login-remember" className="cursor-pointer text-[#6b8099] text-[13px]">
                  Recordarme por 30 días
                </label>
              </div>
            )}
          />

          <AuthBackHomeLink className="mt-6" />

          <div className="mt-6 space-y-4">
            <div className="relative text-center">
              <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-[#eaeff6]" />
              <span className="relative bg-white px-3 text-[#9aabc0] text-[11px] uppercase tracking-[0.18em]">
                O continúa con
              </span>
            </div>
            {/* La tarjeta siempre es blanca: el botón no debe seguir el tema oscuro. */}
            <GoogleButton className="w-full [&>button]:border-[#e3e9f2] [&>button]:bg-white [&>button]:text-[#0b1d3a] [&>button]:hover:bg-[#f7f9fc] [&>button]:hover:text-[#0b1d3a]" />
          </div>
        </div>

        <AuthCardActions
          secondaryHref="register"
          secondaryLabel="Registrarme"
          submitLabel="Ingresar"
          loadingLabel="Verificando…"
          loading={enviando}
        />
      </AuthCard>
    </form>
  );
}
