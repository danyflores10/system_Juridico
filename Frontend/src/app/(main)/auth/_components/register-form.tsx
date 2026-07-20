"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

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

export function RegisterForm() {
  const onSubmit = useRegisterSubmit();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const enviando = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="nombre"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-nombre">Nombre completo</FieldLabel>
              <Input
                {...field}
                id="register-nombre"
                type="text"
                placeholder="Ej. Ana Pérez"
                autoComplete="name"
                disabled={enviando}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-email">Correo electrónico</FieldLabel>
              <Input
                {...field}
                id="register-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={enviando}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
              <PasswordInput
                {...field}
                id="register-password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={enviando}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="register-confirm-password">Confirmar contraseña</FieldLabel>
              <PasswordInput
                {...field}
                id="register-confirm-password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={enviando}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button
        className="w-full bg-linear-to-b from-[#2f86ff] to-[#0e63e0] font-medium text-white shadow-[#1279fd]/25 shadow-lg transition-all duration-300 hover:from-[#4292ff] hover:to-[#1670ef] hover:shadow-[#1279fd]/40 hover:shadow-xl active:scale-[0.98]"
        type="submit"
        disabled={enviando}
      >
        {enviando ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Creando cuenta…
          </>
        ) : (
          "Registrarse"
        )}
      </Button>
    </form>
  );
}
