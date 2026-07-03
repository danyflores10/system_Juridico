"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getApiErrorMessage } from "@/lib/api/client";
import { useDocumentos } from "../hooks/use-documentos";
import { useDocumentoMutations } from "../hooks/use-documentos-mutations";
import type { DocumentoFilters, DocumentoList } from "../types/documentos.types";
import { DocumentosTable } from "./documentos-table";

export function DocumentosPageClient() {
  const router = useRouter();
  const [filters, setFilters] = React.useState<DocumentoFilters>({ ordering: "-fecha_recepcion", page: 1 });
  const documents = useDocumentos(React.useDeferredValue(filters));
  const discard = useDocumentoMutations().discard;
  const [target, setTarget] = React.useState<DocumentoList | null>(null);
  async function confirmDiscard() {
    if (!target) return;
    try { await discard.mutateAsync(target.uuid); toast.success("Documento descartado. El PDF original se conserva."); setTarget(null); }
    catch (error) { toast.error("No se pudo descartar.", { description: getApiErrorMessage(error) }); }
  }
  return <div className="flex flex-col gap-4">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-3xl tracking-tight">Documentos jurídicos</h1><p className="text-muted-foreground">Consulte documentos en proceso, pendientes de revisión y archivos finalizados.</p></div><Button onClick={() => router.push("/dashboard/documentos/cargar")}><FileUp /> Cargar PDF manualmente</Button></div>
    {documents.isError ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">{getApiErrorMessage(documents.error)}</div> : null}
    <DocumentosTable data={documents.data?.results ?? []} count={documents.data?.count ?? 0} loading={documents.isLoading} fetching={documents.isFetching} page={filters.page ?? 1} filters={filters} onFiltersChange={setFilters} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} onRefresh={() => void documents.refetch()} onView={(item) => router.push(`/dashboard/documentos/${item.uuid}`)} onDiscard={setTarget} />
    <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && setTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Descartar este documento?</AlertDialogTitle><AlertDialogDescription>Dejará de aparecer en la biblioteca. El PDF y su historial permanecerán almacenados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={discard.isPending} onClick={() => void confirmDiscard()}>{discard.isPending ? "Guardando..." : "Descartar"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
