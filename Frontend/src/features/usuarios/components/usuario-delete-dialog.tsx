"use client";

import { Loader2 } from "lucide-react";

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

import type { Usuario } from "../types";

interface UsuarioDeleteDialogProps {
  readonly usuario: Usuario | null;
  readonly eliminando: boolean;
  readonly onCerrar: () => void;
  readonly onConfirmar: () => void;
}

export function UsuarioDeleteDialog({ usuario, eliminando, onCerrar, onConfirmar }: UsuarioDeleteDialogProps) {
  return (
    <AlertDialog open={usuario !== null} onOpenChange={(estado) => !estado && onCerrar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará definitivamente la cuenta de{" "}
            <span className="font-medium text-foreground">
              {usuario?.nombre} {usuario?.apellido}
            </span>{" "}
            ({usuario?.email}). Esta acción no se puede deshacer. Si solo quieres suspender el acceso, desactiva la
            cuenta en su lugar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={eliminando}
            onClick={(evento) => {
              evento.preventDefault();
              onConfirmar();
            }}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {eliminando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Eliminando…
              </>
            ) : (
              "Eliminar definitivamente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
