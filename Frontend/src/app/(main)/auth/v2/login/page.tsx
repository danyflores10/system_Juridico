import Image from "next/image";
import Link from "next/link";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { LoginForm } from "../../_components/login-form";
import { GoogleButton } from "../../_components/social-auth/google-button";

export default function LoginV2() {
  return (
    <>
      {/* Halo decorativo suave */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-[#1279fd]/8 blur-3xl"
      />

      <div className="mx-auto flex w-full animate-in flex-col justify-center space-y-8 duration-700 fade-in slide-in-from-bottom-4 sm:w-[380px]">
        <div className="space-y-6">
          <span className="inline-flex dark:rounded-2xl dark:bg-white/95 dark:px-3 dark:py-2 dark:shadow-sm">
            <Image
              src="/logo-cj-full.png"
              alt={APP_CONFIG.name}
              width={230}
              height={50}
              priority
              className="h-10 w-auto"
            />
          </span>
          <div className="space-y-2">
            <h1 className="font-bold text-3xl tracking-tight">¡Bienvenido de nuevo!</h1>
            <p className="text-muted-foreground text-sm">Inicia sesión para continuar en el sistema.</p>
          </div>
        </div>
        <div className="space-y-4">
          <GoogleButton className="w-full" />
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">O continúa con</span>
          </div>
          <LoginForm />
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          ¿No tienes una cuenta?{" "}
          <Link prefetch={false} className="font-medium text-[#1279fd] hover:underline" href="register">
            Regístrate
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-muted-foreground text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <Globe className="size-4" />
          ESP
        </div>
      </div>
    </>
  );
}
