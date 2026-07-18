import { apiRequest } from "@/lib/api/client";

import type {
  LeyOriginalModificador,
  ModificadorStats,
  Modificatoria,
  RespuestaProcesar,
  ResultadoDetalle,
  ResultadoResumen,
} from "../types/modificador.types";

function formDataArchivos(archivos: File[]) {
  const formData = new FormData();
  for (const archivo of archivos) formData.append("archivos", archivo);
  return formData;
}

export function obtenerResumen() {
  return apiRequest<{ stats: ModificadorStats }>("modificador/resumen/");
}

export function listarLeyes() {
  return apiRequest<{ leyes: LeyOriginalModificador[]; stats: ModificadorStats }>("modificador/leyes/");
}

export function cargarLeyes(archivos: File[]) {
  return apiRequest<{ mensaje: string; leyes: LeyOriginalModificador[]; omitidos: string[] }>(
    "modificador/leyes/cargar/",
    { method: "POST", body: formDataArchivos(archivos) },
  );
}

export function desactivarLey(id: number) {
  return apiRequest<{ mensaje: string }>(`modificador/leyes/${id}/desactivar/`, { method: "POST" });
}

export function listarModificatorias() {
  return apiRequest<{ modificatorias: Modificatoria[]; stats: ModificadorStats }>("modificador/modificatorias/");
}

export function cargarModificatorias(archivos: File[]) {
  return apiRequest<{ mensaje: string; modificatorias: Modificatoria[]; duplicados: string[]; omitidos: string[] }>(
    "modificador/modificatorias/cargar/",
    { method: "POST", body: formDataArchivos(archivos) },
  );
}

export function reintentarVinculacion(id: number) {
  return apiRequest<{ ok: boolean; mensaje: string; modificatoria: Modificatoria }>(
    `modificador/modificatorias/${id}/reintentar/`,
    { method: "POST" },
  );
}

export function vincularManual(id: number, leyId: number) {
  return apiRequest<{ ok: boolean; mensaje: string; modificatoria: Modificatoria }>(
    `modificador/modificatorias/${id}/vincular/`,
    { method: "POST", body: JSON.stringify({ ley_id: leyId }) },
  );
}

export function procesarModificaciones() {
  return apiRequest<RespuestaProcesar>("modificador/procesar/", { method: "POST" });
}

export function listarResultados() {
  return apiRequest<{ resultados: ResultadoResumen[]; stats: ModificadorStats }>("modificador/resultados/");
}

export function obtenerResultado(id: number) {
  return apiRequest<{ resultado: ResultadoDetalle }>(`modificador/resultados/${id}/`);
}

export function desactivarResultado(id: number) {
  return apiRequest<{ mensaje: string }>(`modificador/resultados/${id}/desactivar/`, { method: "POST" });
}

export function urlDescargaResultado(id: number, formato: "docx" | "pdf") {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  return `${base}/modificador/resultados/${id}/descargar/?formato=${formato}`;
}
