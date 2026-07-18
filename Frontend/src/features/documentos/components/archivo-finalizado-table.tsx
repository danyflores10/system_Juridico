"use client";

import { CalendarDays, Download, Eye, FileText, RefreshCw, Search, ShieldCheck, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type {
  ArchivoFinalizadoFilters,
  ArchivoFinalizadoOpciones,
  ArchivoJuridicoFinalizado,
} from "../types/documentos.types";

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" });

function legalReference(item: ArchivoJuridicoFinalizado) {
  const type = item.tipo_norma ? item.tipo_norma.nombre : "Norma";
  return item.numero ? `${type} N.º ${item.numero}` : type;
}

export function ArchivoFinalizadoTable({
  data,
  count,
  loading,
  fetching,
  page,
  filters,
  options,
  onFiltersChange,
  onPageChange,
  onRefresh,
  onView,
}: {
  data: ArchivoJuridicoFinalizado[];
  count: number;
  loading: boolean;
  fetching: boolean;
  page: number;
  filters: ArchivoFinalizadoFilters;
  options?: ArchivoFinalizadoOpciones;
  onFiltersChange: (filters: ArchivoFinalizadoFilters) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onView: (item: ArchivoJuridicoFinalizado) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / 20));
  const hasDateFilter = [filters.fecha_final_desde, filters.fecha_final_hasta].some(Boolean);
  const filtered = [filters.q, filters.materia, filters.tipo_norma, hasDateFilter].some(Boolean);

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <div className="relative min-w-64 flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre jurídico, código, título o número..."
            value={filters.q ?? ""}
            onChange={(event) => onFiltersChange({ ...filters, q: event.target.value, page: 1 })}
          />
        </div>
        <NativeSelect
          value={filters.materia ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              materia: event.target.value ? Number(event.target.value) : "",
              page: 1,
            })
          }
        >
          <NativeSelectOption value="">Todas las materias</NativeSelectOption>
          {options?.materias.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          value={filters.tipo_norma ?? ""}
          onChange={(event) =>
            onFiltersChange({
              ...filters,
              tipo_norma: event.target.value ? Number(event.target.value) : "",
              page: 1,
            })
          }
        >
          <NativeSelectOption value="">Todos los tipos</NativeSelectOption>
          {options?.tipos_norma.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item.nombre}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={hasDateFilter ? "secondary" : "outline"}>
              <CalendarDays />
              Finalización
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-4 p-4">
            <PopoverHeader>
              <PopoverTitle>Fecha de finalización</PopoverTitle>
            </PopoverHeader>
            <div className="grid gap-2">
              <Label htmlFor="archivo-fecha-desde">Desde</Label>
              <Input
                id="archivo-fecha-desde"
                type="date"
                value={filters.fecha_final_desde ?? ""}
                onChange={(event) => onFiltersChange({ ...filters, fecha_final_desde: event.target.value, page: 1 })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="archivo-fecha-hasta">Hasta</Label>
              <Input
                id="archivo-fecha-hasta"
                type="date"
                min={filters.fecha_final_desde ? filters.fecha_final_desde : undefined}
                value={filters.fecha_final_hasta ?? ""}
                onChange={(event) => onFiltersChange({ ...filters, fecha_final_hasta: event.target.value, page: 1 })}
              />
            </div>
          </PopoverContent>
        </Popover>
        {filtered ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Limpiar filtros"
            onClick={() => onFiltersChange({ ordering: "-fecha_finalizacion", page: 1 })}
          >
            <X />
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="icon"
          disabled={fetching}
          aria-label="Actualizar archivo jurídico"
          title="Actualizar archivo jurídico"
          onClick={onRefresh}
        >
          <RefreshCw className={fetching ? "animate-spin" : undefined} />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-96">Documento final</TableHead>
              <TableHead className="min-w-52">Ficha jurídica</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Consulta</TableHead>
              <TableHead>Finalizado</TableHead>
              <TableHead className="text-right">Archivos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? [1, 2, 3].map((key) => (
                  <TableRow key={key}>
                    {[1, 2, 3, 4, 5, 6].map((cell) => (
                      <TableCell key={cell}>
                        <Skeleton className="h-6 w-28" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}
            {!loading && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-56 text-center">
                  <div className="mx-auto flex max-w-md flex-col items-center gap-2">
                    <FileText className="size-9 text-muted-foreground" />
                    <p className="font-medium">No se encontraron documentos finalizados</p>
                    <p className="text-muted-foreground text-sm">
                      Aquí aparecerán las parejas Word y PDF aprobadas y listas para consulta.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : null}
            {data.map((item) => (
              <TableRow key={item.uuid}>
                <TableCell>
                  <button
                    type="button"
                    className="block max-w-xl text-left"
                    title={item.conversion.nombre_archivo_pdf}
                    onClick={() => onView(item)}
                  >
                    <span className="line-clamp-2 font-semibold leading-5 hover:underline">
                      {item.conversion.nombre_archivo_pdf}
                    </span>
                    <span className="mt-1 block font-mono text-muted-foreground text-xs">{item.codigo_interno}</span>
                  </button>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{legalReference(item)}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {item.fecha_emision
                      ? dateFormatter.format(new Date(`${item.fecha_emision}T12:00:00`))
                      : "Sin fecha"}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.materia?.nombre ?? "Sin materia"}</Badge>
                </TableCell>
                <TableCell>
                  {item.conversion.pdf_texto_buscable ? (
                    <Badge variant="outline" className="gap-1 border-emerald-200 text-emerald-700">
                      <ShieldCheck />
                      Texto buscable
                    </Badge>
                  ) : (
                    <Badge variant="outline">Requiere OCR</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.fecha_finalizacion ? dateFormatter.format(new Date(item.fecha_finalizacion)) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={item.conversion.archivo_url ?? undefined}>
                        <Download />
                        Word
                      </a>
                    </Button>
                    <Button asChild size="sm">
                      <a href={item.conversion.archivo_pdf_url ?? undefined}>
                        <FileText />
                        PDF
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Ver ${item.codigo_interno}`}
                      onClick={() => onView(item)}
                    >
                      <Eye />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t p-4 text-sm">
        <span className="text-muted-foreground">{count} documentos finalizados</span>
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
