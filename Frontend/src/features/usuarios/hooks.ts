import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/client";

import { createUsuario, deleteUsuario, getUsuarios, setUsuarioEstado, updateUsuario } from "./api";
import type { UsuarioPayload, UsuarioQuery } from "./types";

export const usuariosQueryKey = ["usuarios"] as const;

export function useUsuarios(query: UsuarioQuery) {
  return useQuery({
    queryKey: [...usuariosQueryKey, query],
    queryFn: () => getUsuarios(query),
    placeholderData: keepPreviousData,
  });
}

export function useUsuarioMutations() {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: usuariosQueryKey });

  const crear = useMutation({
    mutationFn: (payload: UsuarioPayload) => createUsuario(payload),
    onSuccess: (usuario) => {
      invalidar();
      toast.success("Usuario creado", { description: `${usuario.nombre} ya puede iniciar sesión.` });
    },
    onError: (error) => toast.error("No se pudo crear el usuario", { description: getApiErrorMessage(error) }),
  });

  const actualizar = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UsuarioPayload> }) => updateUsuario(id, payload),
    onSuccess: (usuario) => {
      invalidar();
      toast.success("Usuario actualizado", { description: `Los datos de ${usuario.nombre} fueron guardados.` });
    },
    onError: (error) => toast.error("No se pudo actualizar el usuario", { description: getApiErrorMessage(error) }),
  });

  const eliminar = useMutation({
    mutationFn: (id: number) => deleteUsuario(id),
    onSuccess: () => {
      invalidar();
      toast.success("Usuario eliminado", { description: "La cuenta fue eliminada definitivamente." });
    },
    onError: (error) => toast.error("No se pudo eliminar el usuario", { description: getApiErrorMessage(error) }),
  });

  const cambiarEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) => setUsuarioEstado(id, activo),
    onSuccess: (usuario) => {
      invalidar();
      toast.success(usuario.activo ? "Usuario activado" : "Usuario desactivado", {
        description: `${usuario.nombre} ${usuario.activo ? "ya puede" : "ya no puede"} iniciar sesión.`,
      });
    },
    onError: (error) => toast.error("No se pudo cambiar el estado", { description: getApiErrorMessage(error) }),
  });

  return { crear, actualizar, eliminar, cambiarEstado };
}
