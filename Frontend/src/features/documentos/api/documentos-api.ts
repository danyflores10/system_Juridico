import { apiRequest } from "@/lib/api/client";

import type {
  ArchivoFinalizadoFilters,
  ArchivoFinalizadoOpciones,
  ArchivoJuridicoFinalizado,
  CalidadResumen,
  ConversionResumen,
  DocumentoDetail,
  DocumentoFilters,
  DocumentoList,
  ExtraccionResumen,
  PaginatedResponse,
  ProcesamientoResumen,
  PropuestaExtraccion,
  ResultadoCalidad,
  ResultadoConversion,
  ResultadoProcesamiento,
} from "../types/documentos.types";

function buildQuery<T extends object>(filters: T) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== "" && value != null) params.set(key, String(value));
  return params.toString();
}

export function listarDocumentos(filters: DocumentoFilters = {}) {
  return apiRequest<PaginatedResponse<DocumentoList>>(`documentos/?${buildQuery(filters)}`);
}

export function listarArchivoFinalizado(filters: ArchivoFinalizadoFilters = {}) {
  return apiRequest<PaginatedResponse<ArchivoJuridicoFinalizado>>(
    `documentos/archivo-finalizado/?${buildQuery(filters)}`,
  );
}

export function obtenerOpcionesArchivoFinalizado() {
  return apiRequest<ArchivoFinalizadoOpciones>("documentos/archivo-finalizado-opciones/");
}

export function obtenerDocumento(uuid: string) {
  return apiRequest<DocumentoDetail>(`documentos/${uuid}/`);
}

export function cargarDocumento(archivo: File) {
  const form = new FormData();
  form.append("archivo", archivo);
  return apiRequest<DocumentoDetail>("documentos/upload/", { method: "POST", body: form });
}

export function descartarDocumento(uuid: string) {
  return apiRequest<void>(`documentos/${uuid}/descartar/`, { method: "POST" });
}

export function procesarDocumento(uuid: string) {
  return apiRequest<ProcesamientoResumen>(`documentos/${uuid}/procesar/`, { method: "POST" });
}

export function reintentarProcesamiento(uuid: string) {
  return apiRequest<ProcesamientoResumen>(`documentos/${uuid}/reintentar-procesamiento/`, { method: "POST" });
}

export function obtenerResultadoProcesamiento(uuid: string) {
  return apiRequest<ResultadoProcesamiento>(`documentos/${uuid}/resultado-procesamiento/`);
}

export function extraerDatosJuridicos(uuid: string) {
  return apiRequest<ExtraccionResumen>(`documentos/${uuid}/extraer-datos/`, { method: "POST" });
}

export function reintentarExtraccion(uuid: string) {
  return apiRequest<ExtraccionResumen>(`documentos/${uuid}/reintentar-extraccion/`, { method: "POST" });
}

export function obtenerPropuestaExtraccion(uuid: string) {
  return apiRequest<PropuestaExtraccion>(`documentos/${uuid}/propuesta-extraccion/`);
}

export function ejecutarControlCalidad(uuid: string) {
  return apiRequest<CalidadResumen>(`documentos/${uuid}/control-calidad/`, { method: "POST" });
}

export function reintentarControlCalidad(uuid: string) {
  return apiRequest<CalidadResumen>(`documentos/${uuid}/reintentar-calidad/`, { method: "POST" });
}

export function obtenerResultadoCalidad(uuid: string) {
  return apiRequest<ResultadoCalidad>(`documentos/${uuid}/resultado-calidad/`);
}

export function convertirDocumentoWord(uuid: string) {
  return apiRequest<ConversionResumen>(`documentos/${uuid}/convertir-word/`, { method: "POST" });
}

export function reintentarConversionWord(uuid: string) {
  return apiRequest<ConversionResumen>(`documentos/${uuid}/reintentar-conversion/`, { method: "POST" });
}

export function obtenerResultadoConversion(uuid: string) {
  return apiRequest<ResultadoConversion>(`documentos/${uuid}/resultado-conversion/`);
}
