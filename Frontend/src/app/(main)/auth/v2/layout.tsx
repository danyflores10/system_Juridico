import type { ReactNode } from "react";

import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { AuthDecor } from "../_components/auth-decor";

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#eef2f7] px-4 py-14 dark:bg-[#040c1b]">
      {/* Halos amplios que dan profundidad al lienzo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full bg-[#1279fd]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-48 size-[34rem] rounded-full bg-[#022658]/10 blur-3xl"
      />

      <div className="relative w-full max-w-[26rem]">
        <AuthDecor />
        <div className="relative z-10">{children}</div>
      </div>

      <div className="absolute inset-x-0 bottom-5 hidden items-center justify-between px-8 text-[#7d8fa6] text-xs sm:flex dark:text-[#5c7899]">
        <span>{APP_CONFIG.copyright}</span>
        <span className="flex items-center gap-1.5">
          <Globe className="size-3.5" />
          ESP
        </span>
      </div>
    </main>
  );
}
