import { apiRequest } from "@/lib/api/client";

import type { CatalogoDefinition, CatalogoQuery, CatalogoRecord, PaginatedResponse } from "../types/catalogos.types";

function queryString(query: CatalogoQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.activo) params.set("activo", query.activo);
  if (query.ordering) params.set("ordering", query.ordering);
  if (query.page) params.set("page", String(query.page));
  return params.toString();
}

export function getCatalogos(definition: CatalogoDefinition, query: CatalogoQuery = {}) {
  const params = queryString(query);
  return apiRequest<PaginatedResponse<CatalogoRecord>>(`${definition.endpoint}/?${params}`);
}

export function createCatalogo(definition: CatalogoDefinition, payload: Record<string, unknown>) {
  return apiRequest<CatalogoRecord>(`${definition.endpoint}/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCatalogo(definition: CatalogoDefinition, id: number, payload: Record<string, unknown>) {
  return apiRequest<CatalogoRecord>(`${definition.endpoint}/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function setCatalogoStatus(definition: CatalogoDefinition, id: number, active: boolean) {
  return apiRequest<CatalogoRecord>(`${definition.endpoint}/${id}/${active ? "activar" : "desactivar"}/`, {
    method: "POST",
  });
}
