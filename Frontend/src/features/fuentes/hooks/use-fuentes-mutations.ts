import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  actualizarFuente,
  actualizarSeccion,
  cambiarEstadoFuente,
  cambiarEstadoSeccion,
  crearFuente,
  crearSeccion,
  probarConexionFuente,
  ejecutarDescargaFuente,
} from "../api/fuentes-api";
import type { FuentePayload, FuenteSeccionPayload } from "../types/fuentes.types";
import { fuentesQueryKey } from "./use-fuentes";

export function useFuenteMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: fuentesQueryKey });
  const save = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FuentePayload }) =>
      id ? actualizarFuente(id, payload) : crearFuente(payload),
    onSuccess: invalidate,
  });
  const status = useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) => cambiarEstadoFuente(id, activa),
    onSuccess: invalidate,
  });
  const test = useMutation({ mutationFn: probarConexionFuente, onSuccess: invalidate });
  const download = useMutation({
    mutationFn: ({ id, seccion }: { id: number; seccion?: number | null }) => ejecutarDescargaFuente(id, seccion),
    onSuccess: invalidate,
  });
  return { save, status, test, download };
}

export function useSeccionMutations() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: fuentesQueryKey });
  const save = useMutation({
    mutationFn: ({ id, payload }: { id?: number; payload: FuenteSeccionPayload }) =>
      id ? actualizarSeccion(id, payload) : crearSeccion(payload),
    onSuccess: invalidate,
  });
  const status = useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) => cambiarEstadoSeccion(id, activa),
    onSuccess: invalidate,
  });
  return { save, status };
}
