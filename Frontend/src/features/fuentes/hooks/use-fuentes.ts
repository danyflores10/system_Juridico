import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";

import {
  listarEjecuciones,
  listarFuentes,
  listarHallazgos,
  listarSecciones,
  obtenerEjecucion,
  obtenerFuente,
} from "../api/fuentes-api";
import type { FuenteFilters } from "../types/fuentes.types";

export const fuentesQueryKey = ["fuentes"] as const;

export function useFuentes(filters: FuenteFilters) {
  return useQuery({
    queryKey: [...fuentesQueryKey, "listado", filters],
    queryFn: () => listarFuentes(filters),
    placeholderData: keepPreviousData,
  });
}

export function useFuente(id: number) {
  return useQuery({
    queryKey: [...fuentesQueryKey, "detalle", id],
    queryFn: () => obtenerFuente(id),
    enabled: id > 0,
  });
}

export function useResumenFuentes() {
  const results = useQueries({
    queries: [
      { queryKey: [...fuentesQueryKey, "resumen", "total"], queryFn: () => listarFuentes({ page: 1 }) },
      {
        queryKey: [...fuentesQueryKey, "resumen", "activas"],
        queryFn: () => listarFuentes({ activa: "true", page: 1 }),
      },
      {
        queryKey: [...fuentesQueryKey, "resumen", "sin-probar"],
        queryFn: () => listarFuentes({ estado: "NO_PROBADO", page: 1 }),
      },
      {
        queryKey: [...fuentesQueryKey, "resumen", "error"],
        queryFn: () => listarFuentes({ estado: "ERROR", page: 1 }),
      },
    ],
  });
  return {
    values: results.map((result) => result.data?.count ?? 0),
    loading: results.some((result) => result.isLoading),
  };
}

export function useSecciones(fuente: number, page: number) {
  return useQuery({
    queryKey: [...fuentesQueryKey, "secciones", fuente, page],
    queryFn: () => listarSecciones(fuente, page),
    enabled: fuente > 0,
    placeholderData: keepPreviousData,
  });
}

export function useEjecuciones(fuente: number, page: number) {
  return useQuery({
    queryKey: [...fuentesQueryKey, "ejecuciones", fuente, page],
    queryFn: () => listarEjecuciones(fuente, page),
    enabled: fuente > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => query.state.data?.results.some((item) => item.estado === "EN_PROCESO") ? 2000 : false,
  });
}

export function useEjecucion(id: number) {
  return useQuery({
    queryKey: [...fuentesQueryKey, "ejecucion", id],
    queryFn: () => obtenerEjecucion(id),
    enabled: id > 0,
    refetchInterval: (query) => query.state.data?.estado === "EN_PROCESO" ? 2000 : false,
  });
}

export function useHallazgos(ejecucion: number, page = 1, polling = false) {
  return useQuery({
    queryKey: [...fuentesQueryKey, "hallazgos", ejecucion, page],
    queryFn: () => listarHallazgos(ejecucion, page),
    enabled: ejecucion > 0,
    placeholderData: keepPreviousData,
    refetchInterval: polling ? 2000 : false,
  });
}
