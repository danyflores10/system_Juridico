"use client";

import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import type { CatalogoTabKey } from "../types/catalogos.types";
import { CatalogoTabs } from "./catalogo-tabs";

export function CatalogosPageClient({ initialTab }: { initialTab?: CatalogoTabKey | "reglas" }) {
  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Catálogos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Catálogos Jurídicos</h1>
        <p className="mt-1 text-muted-foreground">
          Administra los valores usados para clasificar y organizar normativa jurídica.
        </p>
      </div>
      <CatalogoTabs initialTab={initialTab} />
    </div>
  );
}
