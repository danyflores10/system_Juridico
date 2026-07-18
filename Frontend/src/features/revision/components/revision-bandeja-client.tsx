"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentoStatusBadge } from "@/features/documentos/components/documento-status-badge";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useBandejaRevision, useResumenRevision } from "../hooks/use-revision";
import type { DocumentoBandeja, VistaRevision } from "../types/revision.types";

const views: { value: VistaRevision; label: string; description: string; icon: typeof FileSearch }[] = [
  { value: "", label: "Todos", description: "Documentos por revisar", icon: FileSearch },
  { value: "LISTOS", label: "Listos", description: "Sin alertas graves", icon: CheckCircle2 },
  { value: "ALERTAS", label: "Con observaciones", description: "Requieren una decisión", icon: AlertTriangle },
  {
    value: "BAJA_CONFIANZA",
    label: "Datos por verificar",
    description: "Información que debe confirmarse",
    icon: ShieldAlert,
  },
];

function date(value: string) {
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function ReviewRow({ item, onOpen }: { item: DocumentoBandeja; onOpen: () => void }) {
  return (
    <TableRow className="group cursor-pointer" onClick={onOpen}>
      <TableCell className="min-w-72 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg border bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950">
            <FileSearch className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="font-medium">{item.titulo_propuesto || item.nombre_archivo}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{item.codigo_interno}</span>
              {item.numero_propuesto ? (
                <span>Norma N.º {item.numero_propuesto}</span>
              ) : (
                <span>Número no detectado</span>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {item.alertas_activas ? (
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              item.alertas_graves_activas
                ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/30"
                : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30",
            )}
          >
            <AlertTriangle className="size-3.5" /> {item.alertas_activas} observaciones
          </Badge>
        ) : item.campos_baja_confianza ? (
          <span className="text-sm text-amber-700">Confirmar datos encontrados</span>
        ) : (
          <span className="text-sm text-emerald-700">Verificar y aprobar ficha</span>
        )}
      </TableCell>
      <TableCell>
        <DocumentoStatusBadge estado={item.estado} />
      </TableCell>
      <TableCell>
        <div className="text-sm">{item.tipo_origen_display}</div>
        <div className="text-xs text-muted-foreground">{date(item.fecha_recepcion)}</div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          className="group-hover:bg-foreground group-hover:text-background"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Revisar <ArrowRight className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function RevisionBandejaClient() {
  const router = useRouter();
  const [vista, setVista] = React.useState<VistaRevision>("");
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const deferredSearch = React.useDeferredValue(search);
  const queue = useBandejaRevision({ vista, q: deferredSearch, page });
  const summary = useResumenRevision();
  const pageCount = Math.max(1, Math.ceil((queue.data?.count ?? 0) / 20));

  function changeView(value: VistaRevision) {
    setVista(value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm md:p-8">
        <ClipboardCheck className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative max-w-3xl space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
            <ClipboardCheck className="size-3.5" /> Revisión jurídica
          </span>
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Bandeja de revisión jurídica</h1>
          <p className="max-w-2xl text-primary-foreground/80 text-sm">
            Revise únicamente los documentos que necesitan una decisión jurídica.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {views.map((view, index) => {
          const Icon = view.icon;
          const selected = vista === view.value;
          return (
            <button
              key={view.label}
              type="button"
              onClick={() => changeView(view.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-all",
                selected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "bg-card hover:border-foreground/30 hover:shadow-sm",
              )}
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "grid size-9 place-items-center rounded-lg",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                </div>
                {summary.loading ? (
                  <Skeleton className="h-8 w-10" />
                ) : (
                  <span className="text-2xl font-semibold tabular-nums">{summary.values[index]}</span>
                )}
              </div>
              <div className="mt-3 font-medium">{view.label}</div>
              <div className="text-xs text-muted-foreground">{view.description}</div>
            </button>
          );
        })}
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
              placeholder="Buscar por código, título o número…"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void queue.refetch()} disabled={queue.isFetching}>
            <RefreshCw className={cn("size-4", queue.isFetching && "animate-spin")} /> Actualizar
          </Button>
        </div>
        {queue.isError ? (
          <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            {getApiErrorMessage(queue.error)}
          </div>
        ) : null}
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Documento</TableHead>
                <TableHead>Qué necesita</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Recepción</TableHead>
                <TableHead className="pr-4 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.isLoading
                ? ["a", "b", "c", "d", "e"].map((key) => (
                    <TableRow key={key}>
                      <TableCell colSpan={5} className="p-4">
                        <Skeleton className="h-11 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}
              {!queue.isLoading && !queue.data?.results.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-56 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
                      <CheckCircle2 className="size-5 text-muted-foreground" />
                    </div>
                    <div className="mt-3 font-medium">No hay documentos en esta vista</div>
                    <div className="mt-1 text-sm text-muted-foreground">Cambie el filtro o actualice la bandeja.</div>
                  </TableCell>
                </TableRow>
              ) : null}
              {queue.data?.results.map((item) => (
                <ReviewRow
                  key={item.uuid}
                  item={item}
                  onOpen={() => router.push(`/dashboard/revision-juridica/${item.uuid}`)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            {queue.data?.count ?? 0} documentos · Página {page} de {pageCount}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => setPage((value) => value + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
