import { apiRequest } from "@/lib/api/client";

import type { AprobarRevisionPayload, DocumentoBandeja, DocumentoRevision, PaginatedResponse, RevisionResumen, VistaRevision } from "../types/revision.types";

function query(values: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) if (value !== "" && value != null) params.set(key, String(value));
  return params.toString();
}

export function listarBandejaRevision(values: { vista?: VistaRevision; q?: string; page?: number } = {}) {
  return apiRequest<PaginatedResponse<DocumentoBandeja>>(`documentos/bandeja-revision/?${query(values)}`);
}

export function obtenerRevisionJuridica(uuid: string) {
  return apiRequest<DocumentoRevision>(`documentos/${uuid}/revision-juridica/`);
}

export function iniciarRevisionJuridica(uuid: string) {
  return apiRequest<RevisionResumen>(`documentos/${uuid}/iniciar-revision/`, { method: "POST" });
}

export function aprobarRevisionJuridica(uuid: string, payload: AprobarRevisionPayload) {
  return apiRequest<RevisionResumen>(`documentos/${uuid}/aprobar-revision/`, { method: "POST", body: JSON.stringify(payload) });
}

export function devolverRevisionJuridica(uuid: string, motivo: string) {
  return apiRequest<RevisionResumen>(`documentos/${uuid}/devolver-revision/`, { method: "POST", body: JSON.stringify({ motivo }) });
}
