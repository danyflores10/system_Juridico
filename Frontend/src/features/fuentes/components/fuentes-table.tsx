"use client";

import { Activity, CirclePower, Eye, MoreHorizontal, Pencil, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { FuenteList } from "../types/fuentes.types";
import { ConexionStatusBadge, FuenteStatusBadge } from "./fuente-status-badges";

const skeletonRows = ["one", "two", "three", "four"];

export function FuentesTable({
  sources,
  loading,
  onView,
  onEdit,
  onTest,
  onStatus,
  onRun,
}: {
  sources: FuenteList[];
  loading: boolean;
  onView: (source: FuenteList) => void;
  onEdit: (source: FuenteList) => void;
  onTest: (source: FuenteList) => void;
  onStatus: (source: FuenteList) => void;
  onRun: (source: FuenteList) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Institución y página oficial</TableHead>
            <TableHead>Disponibilidad</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Buscar documentos</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? skeletonRows.map((row) => (
                <TableRow key={row}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <TableCell key={`${row}-${String(index)}`}>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="max-w-64 text-left font-medium hover:text-primary hover:underline"
                      onClick={() => onView(source)}
                    >
                      {source.nombre}
                    </button>
                    <p className="max-w-xl truncate text-muted-foreground text-xs">{source.url_base}</p>
                  </TableCell>
                  <TableCell>
                    <ConexionStatusBadge estado={source.ultimo_estado_prueba} />
                  </TableCell>
                  <TableCell>
                    <FuenteStatusBadge active={source.activa} />
                  </TableCell>
                  <TableCell><Button size="sm" disabled={!source.activa} onClick={() => onRun(source)}><Search /> Buscar ahora</Button></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onView(source)}>
                          <Eye /> Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onEdit(source)}>
                          <Pencil /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onTest(source)}>
                          <Activity /> Probar conexión
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!source.activa} onSelect={() => onRun(source)}>
                          <Search /> Buscar normativa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant={source.activa ? "destructive" : "default"}
                          onSelect={() => onStatus(source)}
                        >
                          <CirclePower /> {source.activa ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {!loading && sources.length === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center">
          <div className="rounded-full bg-muted p-3">
            <Activity className="size-6 text-muted-foreground" />
          </div>
          <p className="font-medium">No se encontraron fuentes</p>
          <p className="text-muted-foreground text-sm">Registre una fuente oficial o cambie los filtros.</p>
        </div>
      ) : null}
    </div>
  );
}
