import Link from "next/link";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { RegisterForm } from "../../_components/register-form";
import { GoogleButton } from "../../_components/social-auth/google-button";

export default function RegisterV2() {
  return (
    <>
      <div className="mx-auto flex w-full animate-in flex-col justify-center space-y-8 duration-700 fade-in slide-in-from-bottom-4 sm:w-[360px]">
        <div className="space-y-2">
          <h1 className="font-bold text-3xl tracking-tight">Comienza ahora</h1>
          <p className="text-muted-foreground text-sm">Crea tu cuenta en menos de un minuto.</p>
        </div>
        <div className="space-y-4">
          <GoogleButton className="w-full" />
          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">O continúa con</span>
          </div>
          <RegisterForm />
        </div>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          ¿Ya tienes una cuenta?{" "}
          <Link prefetch={false} className="text-foreground" href="login">
            Inicia sesión
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ESP
        </div>
      </div>
    </>
  );
}
