import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  listarArchivoFinalizado,
  listarDocumentos,
  obtenerDocumento,
  obtenerOpcionesArchivoFinalizado,
  obtenerPropuestaExtraccion,
  obtenerResultadoCalidad,
  obtenerResultadoConversion,
  obtenerResultadoProcesamiento,
} from "../api/documentos-api";
import type { ArchivoFinalizadoFilters, DocumentoFilters } from "../types/documentos.types";

export const documentosQueryKey = ["documentos"] as const;

export function useDocumentos(filters: DocumentoFilters, enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "listado", filters],
    queryFn: () => listarDocumentos(filters),
    placeholderData: keepPreviousData,
    refetchInterval: 5000,
    enabled,
  });
}

export function useArchivoFinalizado(filters: ArchivoFinalizadoFilters, enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "archivo-finalizado", filters],
    queryFn: () => listarArchivoFinalizado(filters),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useArchivoFinalizadoOpciones(enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "archivo-finalizado-opciones"],
    queryFn: obtenerOpcionesArchivoFinalizado,
    enabled,
  });
}

export function useDocumento(uuid: string) {
  return useQuery({
    queryKey: [...documentosQueryKey, "detalle", uuid],
    queryFn: () => obtenerDocumento(uuid),
    enabled: Boolean(uuid),
    refetchInterval: (query) => {
      const document = query.state.data;
      return document?.estado === "PROCESANDO" ||
        document?.procesamiento?.estado === "EN_COLA" ||
        document?.extraccion?.estado === "EN_COLA" ||
        document?.extraccion?.estado === "EXTRAYENDO" ||
        document?.calidad?.estado === "EN_COLA" ||
        document?.calidad?.estado === "ANALIZANDO" ||
        document?.conversion?.estado === "EN_COLA" ||
        document?.conversion?.estado === "CONVIRTIENDO"
        ? 2000
        : false;
    },
  });
}

export function useResultadoConversion(uuid: string, enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "conversion", uuid],
    queryFn: () => obtenerResultadoConversion(uuid),
    enabled: Boolean(uuid) && enabled,
    refetchInterval: (query) => {
      const conversion = query.state.data;
      return conversion?.estado === "EN_COLA" || conversion?.estado === "CONVIRTIENDO" ? 2000 : false;
    },
  });
}

export function useResultadoCalidad(uuid: string, enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "calidad", uuid],
    queryFn: () => obtenerResultadoCalidad(uuid),
    enabled: Boolean(uuid) && enabled,
    refetchInterval: (query) => {
      const evaluacion = query.state.data;
      return evaluacion?.estado === "EN_COLA" || evaluacion?.estado === "ANALIZANDO" ? 2000 : false;
    },
  });
}

export function usePropuestaExtraccion(uuid: string, enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "extraccion", uuid],
    queryFn: () => obtenerPropuestaExtraccion(uuid),
    enabled: Boolean(uuid) && enabled,
    refetchInterval: (query) => {
      const propuesta = query.state.data;
      return propuesta?.estado === "EN_COLA" || propuesta?.estado === "EXTRAYENDO" ? 2000 : false;
    },
  });
}

export function useResultadoProcesamiento(uuid: string, enabled = true) {
  return useQuery({
    queryKey: [...documentosQueryKey, "procesamiento", uuid],
    queryFn: () => obtenerResultadoProcesamiento(uuid),
    enabled: Boolean(uuid) && enabled,
    refetchInterval: (query) => {
      const resultado = query.state.data;
      return resultado?.estado === "EN_COLA" || resultado?.estado === "PROCESANDO" ? 2000 : false;
    },
  });
}
