import { apiRequest } from "@/lib/api/client";

import type {
  EjecucionFuente,
  FuenteDetail,
  FuenteFilters,
  FuenteList,
  FuentePayload,
  FuenteSeccion,
  FuenteSeccionPayload,
  PaginatedResponse,
  PruebaConexionResultado,
  HallazgoFuente,
} from "../types/fuentes.types";

function buildQuery(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== "" && value !== undefined && value !== null) params.set(key, String(value));
  }
  return params.toString();
}

export function listarFuentes(filters: FuenteFilters = {}) {
  return apiRequest<PaginatedResponse<FuenteList>>(`fuentes/?${buildQuery(filters)}`);
}

export function obtenerFuente(id: number) {
  return apiRequest<FuenteDetail>(`fuentes/${id}/`);
}

export function crearFuente(payload: FuentePayload) {
  return apiRequest<FuenteDetail>("fuentes/", { method: "POST", body: JSON.stringify(payload) });
}

export function actualizarFuente(id: number, payload: FuentePayload) {
  return apiRequest<FuenteDetail>(`fuentes/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function cambiarEstadoFuente(id: number, activa: boolean) {
  return apiRequest<FuenteDetail>(`fuentes/${id}/${activa ? "activar" : "desactivar"}/`, { method: "POST" });
}

export function probarConexionFuente(id: number) {
  return apiRequest<PruebaConexionResultado>(`fuentes/${id}/probar-conexion/`, { method: "POST" });
}

export function listarSecciones(fuente: number, page = 1) {
  return apiRequest<PaginatedResponse<FuenteSeccion>>(`fuentes-secciones/?${buildQuery({ fuente, page })}`);
}

export function crearSeccion(payload: FuenteSeccionPayload) {
  return apiRequest<FuenteSeccion>("fuentes-secciones/", { method: "POST", body: JSON.stringify(payload) });
}

export function actualizarSeccion(id: number, payload: FuenteSeccionPayload) {
  return apiRequest<FuenteSeccion>(`fuentes-secciones/${id}/`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function cambiarEstadoSeccion(id: number, activa: boolean) {
  return apiRequest<FuenteSeccion>(`fuentes-secciones/${id}/${activa ? "activar" : "desactivar"}/`, { method: "POST" });
}

export function listarEjecuciones(fuente: number, page = 1) {
  return apiRequest<PaginatedResponse<EjecucionFuente>>(`fuentes-ejecuciones/?${buildQuery({ fuente, page })}`);
}

export function obtenerEjecucion(id: number) {
  return apiRequest<EjecucionFuente>(`fuentes-ejecuciones/${id}/`);
}

export function ejecutarDescargaFuente(id: number, seccion?: number | null) {
  return apiRequest<EjecucionFuente>(`fuentes/${id}/ejecutar-descarga/`, {
    method: "POST",
    body: JSON.stringify(seccion ? { seccion } : {}),
  });
}

export function listarHallazgos(ejecucion: number, page = 1) {
  return apiRequest<PaginatedResponse<HallazgoFuente>>(
    `fuentes-hallazgos/?${buildQuery({ ejecucion, page, ordering: "created_at" })}`,
  );
}
