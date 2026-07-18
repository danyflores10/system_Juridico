import { ApiError } from "@/lib/api/client";

import type { PaginatedResponse, Usuario, UsuarioPayload, UsuarioQuery } from "./types";

/** Peticiones al proxy autenticado del frontend (/api/backend → Django). */
async function bffRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // Con FormData dejamos que el navegador fije el Content-Type (incluye el boundary).
  const esFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const respuesta = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body && !esFormData ? { "Content-Type": "application/json" } : {}),
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

/** Cuerpo multipart cuando hay foto de por medio; si no, JSON simple. */
function cuerpoUsuario(payload: Partial<UsuarioPayload>): FormData | string {
  if (payload.avatar === undefined) return JSON.stringify(payload);
  const datos = new FormData();
  if (payload.nombre !== undefined) datos.set("nombre", payload.nombre);
  if (payload.apellido !== undefined) datos.set("apellido", payload.apellido ?? "");
  if (payload.email !== undefined) datos.set("email", payload.email);
  if (payload.rol !== undefined) datos.set("rol", payload.rol);
  if (payload.activo !== undefined) datos.set("activo", String(payload.activo));
  if (payload.password) datos.set("password", payload.password);
  if (payload.avatar instanceof File) datos.set("avatar_upload", payload.avatar);
  else if (payload.avatar === null) datos.set("avatar_clear", "true");
  return datos;
}

export function createUsuario(payload: UsuarioPayload) {
  return bffRequest<Usuario>("usuarios", { method: "POST", body: cuerpoUsuario(payload) });
}

export function updateUsuario(id: number, payload: Partial<UsuarioPayload>) {
  return bffRequest<Usuario>(`usuarios/${id}`, { method: "PATCH", body: cuerpoUsuario(payload) });
}

export function deleteUsuario(id: number) {
  return bffRequest<null>(`usuarios/${id}`, { method: "DELETE" });
}

export function setUsuarioEstado(id: number, activo: boolean) {
  return bffRequest<Usuario>(`usuarios/${id}/${activo ? "activar" : "desactivar"}`, { method: "POST" });
}
