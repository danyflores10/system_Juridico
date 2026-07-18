"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { FileCheck2, Files, FileUp } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api/client";

import { useArchivoFinalizado, useArchivoFinalizadoOpciones, useDocumentos } from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import type {
  ArchivoFinalizadoFilters,
  ArchivoJuridicoFinalizado,
  DocumentoFilters,
  DocumentoList,
} from "../types/documentos.types";
import { ArchivoFinalizadoTable } from "./archivo-finalizado-table";
import { DocumentosTable } from "./documentos-table";

type LibrarySection = "seguimiento" | "archivo-finalizado";

export function DocumentosPageClient() {
  const router = useRouter();
  const [section, setSection] = React.useState<LibrarySection>("seguimiento");
  const [filters, setFilters] = React.useState<DocumentoFilters>({
    ordering: "-fecha_recepcion",
    page: 1,
  });
  const [archiveFilters, setArchiveFilters] = React.useState<ArchivoFinalizadoFilters>({
    ordering: "-fecha_finalizacion",
    page: 1,
  });
  const deferredFilters = React.useDeferredValue(filters);
  const deferredArchiveFilters = React.useDeferredValue(archiveFilters);
  const documents = useDocumentos(deferredFilters, section === "seguimiento");
  const archive = useArchivoFinalizado(deferredArchiveFilters, section === "archivo-finalizado");
  const archiveOptions = useArchivoFinalizadoOpciones(section === "archivo-finalizado");
  const discard = useDocumentoMutations().discard;
  const [target, setTarget] = React.useState<DocumentoList | null>(null);

  async function confirmDiscard() {
    if (!target) return;
    try {
      await discard.mutateAsync(target.uuid);
      toast.success("Documento descartado. El PDF original se conserva.");
      setTarget(null);
    } catch (error) {
      toast.error("No se pudo descartar.", { description: getApiErrorMessage(error) });
    }
  }

  function openArchiveItem(item: ArchivoJuridicoFinalizado) {
    router.push(`/dashboard/documentos/${item.uuid}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl tracking-tight">Documentos jurídicos</h1>
          <p className="text-muted-foreground">
            Gestione los originales y consulte por separado la colección jurídica finalizada.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/documentos/cargar")}>
          <FileUp />
          Cargar PDF manualmente
        </Button>
      </div>

      <Tabs value={section} onValueChange={(value) => setSection(value as LibrarySection)} className="gap-4">
        <TabsList className="h-auto w-fit p-1">
          <TabsTrigger value="seguimiento" className="gap-2 px-4 py-2">
            <Files />
            Seguimiento y originales
          </TabsTrigger>
          <TabsTrigger value="archivo-finalizado" className="gap-2 px-4 py-2">
            <FileCheck2 />
            Archivo jurídico finalizado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="seguimiento" className="space-y-4">
          {documents.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
              {getApiErrorMessage(documents.error)}
            </div>
          ) : null}
          <DocumentosTable
            data={documents.data?.results ?? []}
            count={documents.data?.count ?? 0}
            loading={documents.isLoading}
            fetching={documents.isFetching}
            page={filters.page ?? 1}
            filters={filters}
            onFiltersChange={setFilters}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            onRefresh={() => void documents.refetch()}
            onView={(item) => router.push(`/dashboard/documentos/${item.uuid}`)}
            onDiscard={setTarget}
          />
        </TabsContent>

        <TabsContent value="archivo-finalizado" className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <FileCheck2 className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                  Colección aprobada y lista para consulta
                </p>
                <p className="mt-1 text-emerald-800 text-sm dark:text-emerald-300">
                  Cada registro conserva su Word final y un PDF con texto buscable usando la misma nomenclatura
                  jurídica.
                </p>
              </div>
            </div>
          </div>
          {archive.isError || archiveOptions.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
              {getApiErrorMessage(archive.error ?? archiveOptions.error)}
            </div>
          ) : null}
          <ArchivoFinalizadoTable
            data={archive.data?.results ?? []}
            count={archive.data?.count ?? 0}
            loading={archive.isLoading}
            fetching={archive.isFetching}
            page={archiveFilters.page ?? 1}
            filters={archiveFilters}
            options={archiveOptions.data}
            onFiltersChange={setArchiveFilters}
            onPageChange={(page) => setArchiveFilters((current) => ({ ...current, page }))}
            onRefresh={() => {
              void archive.refetch();
              void archiveOptions.refetch();
            }}
            onView={openArchiveItem}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar este documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en la biblioteca. El PDF y su historial permanecerán almacenados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={discard.isPending} onClick={() => void confirmDiscard()}>
              {discard.isPending ? "Guardando..." : "Descartar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
