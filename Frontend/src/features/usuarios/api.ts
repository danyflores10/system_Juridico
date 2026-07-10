import { ApiError } from "@/lib/api/client";

import type { PaginatedResponse, Usuario, UsuarioPayload, UsuarioQuery } from "./types";

/** Peticiones al proxy autenticado del frontend (/api/backend → Django). */
async function bffRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload: unknown = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const detalle =
      payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string"
        ? payload.detail
        : `La API respondió con el estado ${respuesta.status}.`;
    throw new ApiError(detalle, respuesta.status, payload);
  }
  return payload as T;
}

export function getUsuarios(query: UsuarioQuery = {}) {
  const params = new URLSearchParams();
  if (query.q) params.set("search", query.q);
  if (query.rol) params.set("rol", query.rol);
  if (query.activo) params.set("is_active", query.activo);
  if (query.page) params.set("page", String(query.page));
  const cadena = params.toString();
  return bffRequest<PaginatedResponse<Usuario>>(`usuarios${cadena ? `?${cadena}` : ""}`);
}

export function createUsuario(payload: UsuarioPayload) {
  return bffRequest<Usuario>("usuarios", { method: "POST", body: JSON.stringify(payload) });
}

export function updateUsuario(id: number, payload: Partial<UsuarioPayload>) {
  return bffRequest<Usuario>(`usuarios/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteUsuario(id: number) {
  return bffRequest<null>(`usuarios/${id}`, { method: "DELETE" });
}

export function setUsuarioEstado(id: number, activo: boolean) {
  return bffRequest<Usuario>(`usuarios/${id}/${activo ? "activar" : "desactivar"}`, { method: "POST" });
}
