import Link from "next/link";

import { ClipboardCheck, FileText, Scale } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ResumenFuncional } from "./_components/resumen-funcional";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm md:p-8">
        <Scale className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
              <Scale className="size-3.5" />
              Pantalla principal
            </span>
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Resumen jurídico</h1>
            <p className="max-w-2xl text-primary-foreground/80 text-sm">
              Estado real de la gestión normativa: documentos, revisión jurídica, fuentes y consolidación en una sola
              vista.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/revision-juridica">
                <ClipboardCheck />
                Bandeja de revisión
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/dashboard/documentos">
                <FileText />
                Documentos jurídicos
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Resumen con datos reales de los módulos funcionales */}
      <ResumenFuncional />
    </div>
  );
}
