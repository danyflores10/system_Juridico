"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { getApiErrorMessage } from "@/lib/api/client";

import { useFuentes } from "../hooks/use-fuentes";
import { useFuenteMutations } from "../hooks/use-fuentes-mutations";
import type { FuenteFilters, FuenteList } from "../types/fuentes.types";
import { FuenteFormDialog } from "./fuente-form-dialog";
import { FuentesTable } from "./fuentes-table";

export function FuentesPageClient() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<FuenteFilters>({ ordering: "nombre" });
  const [formOpen, setFormOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<number | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<FuenteList | null>(null);
  const data = useFuentes({ ...filters, q: deferredQuery, page });
  const mutations = useFuenteMutations();
  const totalPages = Math.max(1, Math.ceil((data.data?.count ?? 0) / 20));

  function updateFilter<Key extends keyof FuenteFilters>(key: Key, value: FuenteFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function testConnection(source: FuenteList) {
    try {
      const result = await mutations.test.mutateAsync(source.id);
      if (result.estado === "DISPONIBLE") toast.success(result.mensaje, { description: `HTTP ${result.codigo_http}` });
      else toast.error(result.mensaje);
    } catch (error) {
      toast.error("No se pudo probar la conexión.", { description: getApiErrorMessage(error) });
    }
  }

  async function changeStatus() {
    if (!statusTarget) return;
    try {
      await mutations.status.mutateAsync({ id: statusTarget.id, activa: !statusTarget.activa });
      toast.success(statusTarget.activa ? "Fuente desactivada." : "Fuente activada.");
      setStatusTarget(null);
    } catch (error) {
      toast.error("No se pudo cambiar el estado.", { description: getApiErrorMessage(error) });
    }
  }

  async function runDownload(source: FuenteList) {
    try {
      const execution = await mutations.download.mutateAsync({ id: source.id });
      toast.success("Búsqueda automática iniciada.", { description: source.nombre });
      router.push(`/dashboard/fuentes/${source.id}/ejecuciones/${execution.id}`);
    } catch (error) {
      toast.error("No se pudo iniciar la búsqueda.", { description: getApiErrorMessage(error) });
    }
  }

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
            <BreadcrumbPage>Cargador jurídico</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Cargador Jurídico</h1>
          <p className="mt-1 text-muted-foreground">
            Indique los portales oficiales y el sistema buscará normativa automáticamente.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditId(null);
            setFormOpen(true);
          }}
        >
          <Plus /> Nueva fuente
        </Button>
      </div>
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Portales oficiales</CardTitle>
          <CardDescription>Registre únicamente la institución y la página donde publica sus documentos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={query}
                placeholder="Buscar fuente..."
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <NativeSelect
              className="w-full"
              value={filters.activa ?? ""}
              onChange={(event) => updateFilter("activa", event.target.value as FuenteFilters["activa"])}
            >
              <NativeSelectOption value="">Todos los estados</NativeSelectOption>
              <NativeSelectOption value="true">Activas</NativeSelectOption>
              <NativeSelectOption value="false">Inactivas</NativeSelectOption>
            </NativeSelect>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => data.refetch()}
              disabled={data.isFetching}
            >
              <RefreshCw className={data.isFetching ? "animate-spin" : undefined} />
            </Button>
          </div>
          {data.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
              {getApiErrorMessage(data.error)}
            </div>
          ) : null}
          <FuentesTable
            sources={data.data?.results ?? []}
            loading={data.isLoading}
            onView={(source) => router.push(`/dashboard/fuentes/${source.id}`)}
            onEdit={(source) => {
              setEditId(source.id);
              setFormOpen(true);
            }}
            onTest={(source) => void testConnection(source)}
            onRun={(source) => void runDownload(source)}
            onStatus={setStatusTarget}
          />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              {data.data?.count ?? 0} fuentes · Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <FuenteFormDialog sourceId={editId} open={formOpen} onOpenChange={setFormOpen} />
      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿{statusTarget?.activa ? "Desactivar" : "Activar"} esta fuente?</AlertDialogTitle>
            <AlertDialogDescription>
              La fuente permanecerá registrada y podrá cambiarse nuevamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void changeStatus()}>
              {mutations.status.isPending ? "Guardando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
