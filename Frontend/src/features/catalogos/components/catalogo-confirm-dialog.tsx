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

import type { CatalogoRecord } from "../types/catalogos.types";

export function CatalogoConfirmDialog({
  item,
  pending,
  onOpenChange,
  onConfirm,
}: {
  item: CatalogoRecord | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const name = String(item?.nombre ?? item?.palabra_clave ?? item?.expresion ?? "este registro");
  const action = item?.activo ? "desactivar" : "activar";
  let confirmLabel = item?.activo ? "Desactivar" : "Activar";
  if (pending) confirmLabel = "Guardando...";
  return (
    <AlertDialog open={Boolean(item)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desea {action} este registro?</AlertDialogTitle>
          <AlertDialogDescription>
            {name}.{" "}
            {item?.activo
              ? "El registro permanecerá en la base de datos y podrá reactivarse."
              : "Volverá a estar disponible en los formularios."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
