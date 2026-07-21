import type { ReactNode } from "react";

import { Globe } from "lucide-react";

import { VantaBackground } from "@/components/ui/vanta-background";
import { APP_CONFIG } from "@/config/app-config";

import { AuthHeroPanel } from "../_components/auth-hero-panel";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid min-h-dvh w-full lg:grid-cols-[1fr_1.08fr]">
      {/* Mitad del formulario, sobre niebla animada */}
      <section className="relative flex items-center justify-center overflow-hidden bg-[#ffebeb] px-4 py-14">
        {/* El color de fondo de arriba hace de respaldo mientras la niebla carga */}
        <VantaBackground
          efecto="fog"
          highlightColor={0xffc300}
          midtoneColor={0xff1f00}
          lowlightColor={0x2d00ff}
          baseColor={0xffebeb}
          blurFactor={0.6}
          zoom={1}
          speed={1}
        />

        <div className="relative z-10 w-full max-w-[26rem]">{children}</div>

        <div className="absolute inset-x-0 bottom-5 z-10 hidden items-center justify-between px-8 text-[#4a3b3b] text-xs drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)] sm:flex">
          <span>{APP_CONFIG.copyright}</span>
          <span className="flex items-center gap-1.5">
            <Globe className="size-3.5" />
            ESP
          </span>
        </div>
      </section>

      {/* Mitad de marca: solo desde pantallas grandes */}
      <AuthHeroPanel />
    </main>
  );
}
