import type { PaginatedResponse } from "@/features/usuarios/types";
import { ApiError } from "@/lib/api/client";

import type { ResumenSuscriptores, Suscriptor, SuscriptorQuery } from "./types";

/** Peticiones al proxy autenticado del frontend (/api/backend → Django). */
async function bffRequest<T>(path: string): Promise<T> {
  const respuesta = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    headers: { Accept: "application/json" },
  });
  const payload: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const detalle =
      payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string"
        ? payload.detail
        : `La API respondió con el estado ${respuesta.status}.`;
    throw new ApiError(detalle, respuesta.status, payload);
  }
  return payload as T;
}

export function getSuscriptores(query: SuscriptorQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set("search", query.q);
  if (query.estado) params.set("estado", query.estado);
  if (query.plan) params.set("plan__codigo", query.plan);
  if (query.page) params.set("page", String(query.page));
  const cadena = params.toString();
  return bffRequest<PaginatedResponse<Suscriptor>>(`suscripciones/admin/suscripciones${cadena ? `?${cadena}` : ""}`);
}

export function getResumenSuscriptores() {
  return bffRequest<ResumenSuscriptores>("suscripciones/admin/resumen");
}
