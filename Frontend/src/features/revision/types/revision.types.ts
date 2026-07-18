import type { DocumentoEstado, DocumentoOrigen } from "@/features/documentos/types/documentos.types";

export type PaginatedResponse<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type VistaRevision = "" | "LISTOS" | "ALERTAS" | "BAJA_CONFIANZA";
export type CatalogoRevision = {
  id: number;
  codigo: string;
  nombre: string;
  sigla?: string;
  abreviatura_archivo?: string;
  carpeta_destino?: string;
};

export type RevisionResumen = {
  id: number;
  numero_revision: number;
  estado: "EN_CURSO" | "APROBADA" | "DEVUELTA";
  estado_display: string;
  revisado_por: number | null;
  revisado_por_nombre: string | null;
  observaciones: string;
  motivo_devolucion: string;
  ficha_anterior: Record<string, string>;
  ficha_aprobada: Record<string, string>;
  iniciada_at: string;
  finalizada_at: string | null;
  updated_at: string;
  cambios: CambioRevision[];
  decisiones_alertas: DecisionAlertaAuditada[];
};

export type DocumentoBandeja = {
  id: number;
  uuid: string;
  codigo_interno: string;
  tipo_origen: DocumentoOrigen;
  tipo_origen_display: string;
  estado: DocumentoEstado;
  estado_display: string;
  nombre_archivo: string;
  fecha_recepcion: string;
  created_at: string;
  titulo_propuesto: string;
  numero_propuesto: string;
  confianza_global: string | null;
  resultado_calidad: string;
  puntuacion_calidad: string | null;
  alertas_activas: number;
  alertas_graves_activas: number;
  campos_baja_confianza: number;
  revision_activa: RevisionResumen | null;
};

export type EvidenciaRevision = {
  campo: string;
  campo_display: string;
  valor_propuesto: string;
  confianza: string;
  numero_pagina: number | null;
  fragmento: string;
  regla_aplicada: string;
};

export type PropuestaRevision = {
  estado: string;
  estado_display: string;
  confianza_global: string | null;
  tipo_norma_propuesto: CatalogoRevision | null;
  numero_propuesto: string;
  fecha_emision_propuesta: string | null;
  titulo_propuesto: string;
  objeto_propuesto: string;
  efecto_normativo_propuesto: CatalogoRevision | null;
  materia_propuesta: CatalogoRevision | null;
  entidad_emisora_propuesta: CatalogoRevision | null;
  evidencias: EvidenciaRevision[];
};

export type AlertaRevision = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  severidad: "INFORMATIVA" | "LEVE" | "GRAVE";
  severidad_display: string;
  estado: "ACTIVA" | "RESUELTA" | "IGNORADA";
  estado_display: string;
  evidencia: Record<string, unknown>;
  nota_resolucion: string;
  resuelta_at: string | null;
  created_at: string;
};

export type CalidadRevision = {
  estado: string;
  resultado: string;
  resultado_display: string;
  puntuacion_calidad: string | null;
  total_alertas: number;
  alertas_leves: number;
  alertas_graves: number;
  alertas: AlertaRevision[];
};

export type HistorialRevision = {
  id: number;
  accion: string;
  accion_display: string;
  estado_anterior: string;
  estado_nuevo: string;
  descripcion: string;
  usuario: number | null;
  usuario_nombre: string | null;
  created_at: string;
};

export type OrigenRevision = {
  id: number;
  fuente: number | null;
  fuente_nombre: string | null;
  seccion: number | null;
  seccion_nombre: string | null;
  url_origen: string;
  created_at: string;
};

export type CambioRevision = {
  id: number;
  campo: string;
  valor_anterior: string;
  valor_nuevo: string;
  origen_valor: string;
  origen_valor_display: string;
  confianza_propuesta: string | null;
  evidencia: Record<string, unknown>;
  created_at: string;
};

export type DecisionAlertaAuditada = {
  id: number;
  alerta: number;
  alerta_codigo: string;
  alerta_titulo: string;
  decision: "RESUELTA" | "IGNORADA";
  decision_display: string;
  justificacion: string;
  created_at: string;
};

export type DocumentoRevision = {
  id: number;
  uuid: string;
  codigo_interno: string;
  tipo_origen: DocumentoOrigen;
  tipo_origen_display: string;
  estado: DocumentoEstado;
  estado_display: string;
  nombre_archivo: string;
  archivo_original_url: string;
  fecha_recepcion: string;
  tipo_norma: CatalogoRevision | null;
  efecto_normativo: CatalogoRevision | null;
  materia: CatalogoRevision | null;
  entidad_emisora: CatalogoRevision | null;
  numero: string;
  fecha_emision: string | null;
  titulo: string;
  objeto: string;
  titulo_archivo: string;
  objeto_resumido: string;
  observaciones: string;
  propuesta: PropuestaRevision;
  calidad: CalidadRevision;
  historial: HistorialRevision[];
  origenes: OrigenRevision[];
  revisiones: RevisionResumen[];
};

export type DecisionAlertaInput = { alerta_id: number; decision: "RESUELTA" | "IGNORADA"; justificacion: string };
export type AprobarRevisionPayload = {
  tipo_norma: number;
  efecto_normativo: number;
  materia: number;
  entidad_emisora: number;
  numero: string;
  fecha_emision: string | null;
  titulo: string;
  objeto: string;
  titulo_archivo: string;
  objeto_resumido: string;
  observaciones: string;
  observaciones_revision: string;
  decisiones_alertas: DecisionAlertaInput[];
};
