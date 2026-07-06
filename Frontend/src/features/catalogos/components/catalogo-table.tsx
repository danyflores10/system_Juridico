import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { CatalogoDefinition, CatalogoRecord } from "../types/catalogos.types";
import { CatalogoActionsMenu } from "./catalogo-actions-menu";
import { CatalogoEmptyState } from "./catalogo-empty-state";
import { CatalogoStatusBadge } from "./catalogo-status-badge";

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" });
const skeletonRows = ["first", "second", "third", "fourth"];

function renderCell(item: CatalogoRecord, key: string, kind = "text") {
  const value = item[key];
  if (kind === "status") return <CatalogoStatusBadge active={Boolean(value)} />;
  if (kind === "boolean") return value ? "Sí" : "No";
  if (kind === "date" && typeof value === "string") return dateFormatter.format(new Date(value));
  if (kind === "link" && typeof value === "string" && value) {
    return (
      <a className="text-primary hover:underline" href={value} target="_blank" rel="noreferrer">
        Visitar sitio
      </a>
    );
  }
  if (value === null || value === undefined || value === "") return <span className="text-muted-foreground">—</span>;
  return String(value);
}

export function CatalogoTable({
  definition,
  items,
  loading,
  count,
  page,
  onPageChange,
  onEdit,
  onStatus,
}: {
  definition: CatalogoDefinition;
  items: CatalogoRecord[];
  loading: boolean;
  count: number;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (item: CatalogoRecord) => void;
  onStatus: (item: CatalogoRecord) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(count / 20));
  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {definition.columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="w-16 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? skeletonRows.map((row) => (
                  <TableRow key={row}>
                    {definition.columns.map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Skeleton className="ml-auto size-8" />
                    </TableCell>
                  </TableRow>
                ))
              : items.map((item) => (
                  <TableRow key={item.id}>
                    {definition.columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {renderCell(item, column.key, column.kind)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <CatalogoActionsMenu item={item} onEdit={() => onEdit(item)} onStatus={() => onStatus(item)} />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        {!loading && items.length === 0 ? <CatalogoEmptyState /> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {count} registros · Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft /> Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente <ChevronRight />
          </Button>
        </div>
      </div>
    </>
  );
}
