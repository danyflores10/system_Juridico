"use client";

import { CirclePower, MoreHorizontal, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApiErrorMessage } from "@/lib/api/client";

import { useSeccionMutations } from "../hooks/use-fuentes-mutations";
import type { FuenteSeccion } from "../types/fuentes.types";
import { FuenteStatusBadge } from "./fuente-status-badges";

export function FuenteSeccionesTable({
  sections,
  onCreate,
  onEdit,
  onRun,
  running,
}: {
  sections: FuenteSeccion[];
  onCreate: () => void;
  onEdit: (section: FuenteSeccion) => void;
  onRun: (section: FuenteSeccion) => void;
  running: boolean;
}) {
  const mutations = useSeccionMutations();
  async function toggle(section: FuenteSeccion) {
    try {
      await mutations.status.mutateAsync({ id: section.id, activa: !section.activa });
      toast.success(section.activa ? "Sección desactivada." : "Sección activada.");
    } catch (error) {
      toast.error("No se pudo cambiar el estado.", { description: getApiErrorMessage(error) });
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreate}>
          <Plus /> Nueva sección
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>URL de listado</TableHead>
              <TableHead>Materia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sections.map((section) => (
              <TableRow key={section.id}>
                <TableCell className="font-mono font-semibold">{section.codigo}</TableCell>
                <TableCell>{section.nombre}</TableCell>
                <TableCell>
                  <a
                    href={section.url_listado}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Abrir URL
                  </a>
                </TableCell>
                <TableCell>{section.materia_predeterminada_detalle?.nombre ?? "Hereda de la fuente"}</TableCell>
                <TableCell>
                  <FuenteStatusBadge active={section.activa} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={!section.activa || running} onSelect={() => onRun(section)}>
                        <Search /> Buscar PDF ahora
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => onEdit(section)}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant={section.activa ? "destructive" : "default"}
                        onSelect={() => void toggle(section)}
                      >
                        <CirclePower /> {section.activa ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {sections.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">Esta fuente todavía no tiene secciones.</div>
        ) : null}
      </div>
    </div>
  );
}
