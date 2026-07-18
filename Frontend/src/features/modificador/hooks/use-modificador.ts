"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getApiErrorMessage } from "@/lib/api/client";

import {
  cargarLeyes,
  cargarModificatorias,
  desactivarLey,
  desactivarResultado,
  listarLeyes,
  listarModificatorias,
  listarResultados,
  obtenerResultado,
  obtenerResumen,
  procesarModificaciones,
  reintentarVinculacion,
  vincularManual,
} from "../api/modificador-api";

export const modificadorQueryKey = ["modificador"] as const;

export function useModificadorResumen() {
  return useQuery({
    queryKey: [...modificadorQueryKey, "resumen"],
    queryFn: obtenerResumen,
    placeholderData: keepPreviousData,
  });
}

export function useLeyesModificador() {
  return useQuery({
    queryKey: [...modificadorQueryKey, "leyes"],
    queryFn: listarLeyes,
    placeholderData: keepPreviousData,
  });
}

export function useModificatorias() {
  return useQuery({
    queryKey: [...modificadorQueryKey, "modificatorias"],
    queryFn: listarModificatorias,
    placeholderData: keepPreviousData,
  });
}

export function useResultadosModificador() {
  return useQuery({
    queryKey: [...modificadorQueryKey, "resultados"],
    queryFn: listarResultados,
    placeholderData: keepPreviousData,
  });
}

export function useResultadoDetalle(id: number) {
  return useQuery({
    queryKey: [...modificadorQueryKey, "resultado", id],
    queryFn: () => obtenerResultado(id),
    enabled: Number.isFinite(id) && id > 0,
  });
}

function useInvalidarModificador() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: modificadorQueryKey });
}

export function useCargarLeyes() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: cargarLeyes,
    onSuccess: (data) => {
      toast.success(data.mensaje);
      for (const om of data.omitidos.slice(0, 3)) toast.warning(om);
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useCargarModificatorias() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: cargarModificatorias,
    onSuccess: (data) => {
      toast.success(data.mensaje);
      for (const dup of data.duplicados.slice(0, 3)) {
        toast.warning(`Duplicado rechazado: ${dup}`);
      }
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useReintentarVinculacion() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: reintentarVinculacion,
    onSuccess: (data) => {
      if (data.ok) toast.success(data.mensaje);
      else toast.warning(data.mensaje);
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useVincularManual() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: ({ id, leyId }: { id: number; leyId: number }) => vincularManual(id, leyId),
    onSuccess: (data) => {
      toast.success(data.mensaje);
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useProcesarModificaciones() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: procesarModificaciones,
    onSuccess: (data) => {
      if (data.ok) toast.success(data.mensaje);
      else toast.warning(data.mensaje);
      for (const err of data.errores.slice(0, 3)) toast.warning(err);
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDesactivarLey() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: desactivarLey,
    onSuccess: (data) => {
      toast.success(data.mensaje);
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}

export function useDesactivarResultado() {
  const invalidar = useInvalidarModificador();
  return useMutation({
    mutationFn: desactivarResultado,
    onSuccess: (data) => {
      toast.success(data.mensaje);
      invalidar();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
}
