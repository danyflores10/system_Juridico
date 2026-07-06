"use client";

import type { ReactNode } from "react";

import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Eye, MoreHorizontal, RefreshCw, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { DocumentoEstadoGrupo, DocumentoFilters, DocumentoList, DocumentoOrigen } from "../types/documentos.types";
import { DocumentoStatusBadge } from "./documento-status-badge";

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" });

function SortableHeader({
  field,
  ordering,
  onChange,
  children,
}: {
  field: string;
  ordering?: string;
  onChange: (field: string) => void;
  children: ReactNode;
}) {
  const active = ordering === field || ordering === `-${field}`;
  let Icon = ArrowUpDown;
  if (ordering === field) Icon = ArrowUp;
  if (ordering === `-${field}`) Icon = ArrowDown;
  return (
    <Button type="button" variant="ghost" className="-ml-3 h-8 px-3 font-semibold" onClick={() => onChange(field)}>
      {children}
      <Icon className={active ? "text-foreground" : "text-muted-foreground"} />
    </Button>
  );
}

export function DocumentosTable({
  data,
  count,
  loading,
  fetching,
  page,
  filters,
  onFiltersChange,
  onPageChange,
  onRefresh,
  onView,
  onDiscard,
}: {
  data: DocumentoList[];
  count: number;
  loading: boolean;
  fetching: boolean;
  page: number;
  filters: DocumentoFilters;
  onFiltersChange: (filters: DocumentoFilters) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onView: (item: DocumentoList) => void;
  onDiscard: (item: DocumentoList) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / 20));
  const hasDateFilter = Boolean(filters.fecha_desde) || Boolean(filters.fecha_hasta);
  const filtered = [
    filters.q,
    filters.estado_grupo,
    filters.tipo_origen,
    filters.fecha_desde,
    filters.fecha_hasta,
  ].some(Boolean);
  function changeOrdering(field: string) {
    const ordering = filters.ordering === `-${field}` ? field : `-${field}`;
    onFiltersChange({ ...filters, ordering, page: 1 });
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <Input
          className="min-w-56 flex-1 sm:max-w-80"
          placeholder="Buscar por código o archivo..."
          value={filters.q ?? ""}
          onChange={(e) => onFiltersChange({ ...filters, q: e.target.value, page: 1 })}
        />
        <NativeSelect
          value={filters.estado_grupo ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              estado_grupo: e.target.value as "" | DocumentoEstadoGrupo,
              estado: "",
              ordering: e.target.value === "FINALIZADO" ? "-fecha_finalizacion" : filters.ordering,
              page: 1,
            })
          }
        >
          <NativeSelectOption value="">Todos los estados</NativeSelectOption>
          <NativeSelectOption value="BORRADOR">Borrador</NativeSelectOption>
          <NativeSelectOption value="EN_PROCESO">En proceso</NativeSelectOption>
          <NativeSelectOption value="NECESITA_REVISION">Necesita revisión</NativeSelectOption>
          <NativeSelectOption value="NECESITA_ATENCION">Necesita atención</NativeSelectOption>
          <NativeSelectOption value="PREPARANDO_FINAL">Preparando archivo final</NativeSelectOption>
          <NativeSelectOption value="FINALIZADO">Finalizado</NativeSelectOption>
          <NativeSelectOption value="DUPLICADO">Documento repetido</NativeSelectOption>
          <NativeSelectOption value="DESCARTADO">Descartado</NativeSelectOption>
        </NativeSelect>
        <NativeSelect
          value={filters.tipo_origen ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, tipo_origen: e.target.value as "" | DocumentoOrigen, page: 1 })
          }
        >
          <NativeSelectOption value="">Todos los orígenes</NativeSelectOption>
          <NativeSelectOption value="CARGA_MANUAL">Carga manual</NativeSelectOption>
          <NativeSelectOption value="DESCARGA_AUTOMATICA">Descarga automática</NativeSelectOption>
        </NativeSelect>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={hasDateFilter ? "secondary" : "outline"} className="relative">
              <CalendarDays />
              Rango de fechas
              {hasDateFilter ? <span className="size-2 rounded-full bg-primary" aria-hidden="true" /> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-4 p-4">
            <PopoverHeader>
              <PopoverTitle>Filtrar por fecha de carga</PopoverTitle>
            </PopoverHeader>
            <div className="grid gap-2">
              <Label htmlFor="documentos-fecha-desde">Fecha desde</Label>
              <Input
                id="documentos-fecha-desde"
                type="date"
                value={filters.fecha_desde ?? ""}
                onChange={(e) => onFiltersChange({ ...filters, fecha_desde: e.target.value, page: 1 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="documentos-fecha-hasta">Fecha hasta</Label>
              <Input
                id="documentos-fecha-hasta"
                type="date"
                min={filters.fecha_desde ?? undefined}
                value={filters.fecha_hasta ?? ""}
                onChange={(e) => onFiltersChange({ ...filters, fecha_hasta: e.target.value, page: 1 })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!hasDateFilter}
              onClick={() => onFiltersChange({ ...filters, fecha_desde: "", fecha_hasta: "", page: 1 })}
            >
              Limpiar fechas
            </Button>
          </PopoverContent>
        </Popover>
        {filtered ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onFiltersChange({ ordering: "-fecha_recepcion", page: 1 })}
          >
            <X />
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={fetching}
          aria-label="Actualizar documentos"
          title="Actualizar documentos"
        >
          <RefreshCw className={fetching ? "animate-spin" : undefined} />
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader field="codigo_interno" ordering={filters.ordering} onChange={changeOrdering}>
                Código
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="nombre_archivo_orden" ordering={filters.ordering} onChange={changeOrdering}>
                Archivo original
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="tipo_origen" ordering={filters.ordering} onChange={changeOrdering}>
                Origen
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="estado" ordering={filters.ordering} onChange={changeOrdering}>
                Estado
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="fecha_recepcion" ordering={filters.ordering} onChange={changeOrdering}>
                Fecha de carga
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="fecha_finalizacion" ordering={filters.ordering} onChange={changeOrdering}>
                Fecha de finalización
              </SortableHeader>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? [1, 2, 3].map((key) => (
                <TableRow key={key}>
                  {[1, 2, 3, 4, 5, 6, 7].map((cell) => (
                    <TableCell key={cell}>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
          {!loading && data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-40 text-center text-muted-foreground">
                No se encontraron documentos.
              </TableCell>
            </TableRow>
          ) : null}
          {data.map((item) => (
            <TableRow key={item.uuid}>
              <TableCell className="font-mono font-semibold">{item.codigo_interno}</TableCell>
              <TableCell>
                <button
                  type="button"
                  className="max-w-md truncate text-left font-medium hover:underline"
                  onClick={() => onView(item)}
                >
                  {item.nombre_archivo}
                </button>
              </TableCell>
              <TableCell>{item.tipo_origen_display}</TableCell>
              <TableCell>
                <DocumentoStatusBadge estado={item.estado} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {dateFormatter.format(new Date(item.fecha_recepcion))}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.fecha_finalizacion ? dateFormatter.format(new Date(item.fecha_finalizacion)) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onView(item)}>
                      <Eye /> Ver detalle
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => onDiscard(item)}>
                      <Trash2 /> Descartar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t p-4 text-sm">
        <span className="text-muted-foreground">{count} documentos</span>
        <div className="flex items-center gap-3">
          <span>
            Página {page} de {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
