"use client";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email({ message: "Ingresa un correo electrónico válido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  remember: z.boolean().optional(),
});

function extraerMensajeError(payload: unknown): string {
  if (payload && typeof payload === "object") {
    const registro = payload as Record<string, unknown>;
    for (const clave of ["detail", "non_field_errors", "email", "password"]) {
      const valor = registro[clave];
      if (typeof valor === "string") return valor;
      if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
    }
  }
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

export function LoginForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (valores: z.infer<typeof formSchema>) => {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(valores),
    }).catch(() => null);

    if (!respuesta) {
      toast.error("Sin conexión", { description: "No se pudo contactar al servidor." });
      return;
    }

    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      toast.error("No se pudo iniciar sesión", { description: extraerMensajeError(datos) });
      return;
    }

    const usuario = (datos as { usuario?: { nombre?: string } }).usuario;
    toast.success(`¡Bienvenido${usuario?.nombre ? `, ${usuario.nombre}` : ""}!`, {
      description: "Ingresando al panel principal.",
    });
    router.replace("/dashboard/default");
    router.refresh();
  };

  const enviando = form.formState.isSubmitting;

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
              <Input
                {...field}
                id="login-email"
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
              <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={enviando}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="remember"
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <Checkbox
                id="login-remember"
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                disabled={enviando}
                aria-invalid={fieldState.invalid}
              />
              <FieldContent>
                <FieldLabel htmlFor="login-remember" className="font-normal">
                  Recordarme por 30 días
                </FieldLabel>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldContent>
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
            Verificando…
          </>
        ) : (
          "Ingresar"
        )}
      </Button>
    </form>
  );
}
