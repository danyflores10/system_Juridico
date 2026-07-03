export type DocumentoEstado =
  | "BORRADOR"
  | "PENDIENTE_PROCESAMIENTO"
  | "PROCESANDO"
  | "PENDIENTE_EXTRACCION"
  | "PENDIENTE_REVISION"
  | "CONTROL_CALIDAD"
  | "PENDIENTE_APROBACION"
  | "LISTO_PARA_CONVERSION"
  | "PENDIENTE_REVISION_RAPIDA"
  | "OBSERVADO"
  | "DUPLICADO_CONFIRMADO"
  | "CONVIRTIENDO"
  | "ERROR_CONVERSION"
  | "FINALIZADO"
  | "VALIDADO"
  | "ERROR"
  | "DESCARTADO";

export type DocumentoOrigen = "CARGA_MANUAL" | "DESCARGA_AUTOMATICA";
export type DocumentoEstadoGrupo =
  | "BORRADOR"
  | "EN_PROCESO"
  | "NECESITA_REVISION"
  | "NECESITA_ATENCION"
  | "PREPARANDO_FINAL"
  | "FINALIZADO"
  | "DUPLICADO"
  | "DESCARTADO";
export type ProcesamientoEstado = "EN_COLA" | "PROCESANDO" | "COMPLETADO" | "ERROR";
export type TipoPdf = "TEXTO" | "ESCANEADO" | "MIXTO" | "DESCONOCIDO";
export type ExtraccionEstado = "EN_COLA" | "EXTRAYENDO" | "COMPLETADA" | "ERROR";
export type CalidadEstado = "EN_COLA" | "ANALIZANDO" | "COMPLETADA" | "ERROR";
export type CalidadResultado = "SIN_ALERTAS_GRAVES" | "ALERTA_LEVE" | "ALERTA_GRAVE" | "DUPLICADO_CONFIRMADO";
export type ConversionEstado = "EN_COLA" | "CONVIRTIENDO" | "COMPLETADA" | "ERROR";

export type ConversionResumen = {
  estado: ConversionEstado;
  estado_display: string;
  tarea_id: string;
  nomenclatura_completa: string;
  nombre_archivo: string;
  carpeta_materia: string;
  ruta_relativa: string;
  hash_sha256: string;
  tamano_bytes: number;
  version: number;
  intentos: number;
  iniciado_at: string | null;
  finalizado_at: string | null;
  duracion_ms: number | null;
  error_codigo: string;
  error_mensaje: string;
  updated_at: string;
};

export type ResultadoConversion = ConversionResumen & {
  detalles_tecnicos: Record<string, unknown>;
  archivo_url: string | null;
};

export type ProcesamientoResumen = {
  estado: ProcesamientoEstado;
  estado_display: string;
  tipo_pdf: TipoPdf;
  tipo_pdf_display: string;
  tarea_id: string;
  numero_paginas: number;
  paginas_con_texto: number;
  paginas_con_ocr: number;
  requirio_ocr: boolean;
  ocr_aplicado: boolean;
  confianza_ocr: string | null;
  caracteres_extraidos: number;
  intentos: number;
  iniciado_at: string | null;
  finalizado_at: string | null;
  duracion_ms: number | null;
  error_codigo: string;
  error_mensaje: string;
  updated_at: string;
};

export type TextoPagina = {
  numero_pagina: number;
  metodo: "TEXTO_ORIGINAL" | "OCR";
  metodo_display: string;
  texto: string;
  caracteres: number;
  confianza_ocr: string | null;
};

export type ResultadoProcesamiento = ProcesamientoResumen & {
  detalles_tecnicos: Record<string, unknown>;
  paginas: TextoPagina[];
  archivo_procesado_url: string | null;
};

export type CatalogoPropuesto = { id: number; codigo: string; nombre: string; sigla?: string };

export type ExtraccionResumen = {
  estado: ExtraccionEstado;
  estado_display: string;
  tarea_id: string;
  confianza_global: string | null;
  intentos: number;
  iniciado_at: string | null;
  finalizado_at: string | null;
  duracion_ms: number | null;
  error_codigo: string;
  error_mensaje: string;
  updated_at: string;
};

export type EvidenciaExtraccion = {
  campo: string;
  campo_display: string;
  valor_propuesto: string;
  confianza: string;
  numero_pagina: number | null;
  fragmento: string;
  regla_aplicada: string;
};

export type PropuestaExtraccion = ExtraccionResumen & {
  tipo_norma_propuesto: CatalogoPropuesto | null;
  numero_propuesto: string;
  fecha_emision_propuesta: string | null;
  titulo_propuesto: string;
  objeto_propuesto: string;
  efecto_normativo_propuesto: CatalogoPropuesto | null;
  materia_propuesta: CatalogoPropuesto | null;
  entidad_emisora_propuesta: CatalogoPropuesto | null;
  detalles_tecnicos: { campos_detectados?: number; campos_totales?: number; motor?: string };
  evidencias: EvidenciaExtraccion[];
};

export type DocumentoCoincidente = {
  uuid: string;
  codigo_interno: string;
  estado: DocumentoEstado;
  fecha_recepcion: string;
};

export type CalidadResumen = {
  estado: CalidadEstado;
  estado_display: string;
  resultado: CalidadResultado | "";
  resultado_display: string;
  tarea_id: string;
  documento_coincidente: DocumentoCoincidente | null;
  puntuacion_calidad: string | null;
  total_alertas: number;
  alertas_leves: number;
  alertas_graves: number;
  intentos: number;
  iniciado_at: string | null;
  finalizado_at: string | null;
  duracion_ms: number | null;
  error_codigo: string;
  error_mensaje: string;
  updated_at: string;
};

export type AlertaCalidad = {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  severidad: "INFORMATIVA" | "LEVE" | "GRAVE";
  severidad_display: string;
  estado: "ACTIVA" | "RESUELTA" | "IGNORADA";
  estado_display: string;
  documento_relacionado: DocumentoCoincidente | null;
  evidencia: Record<string, unknown>;
  nota_resolucion: string;
  resuelta_at: string | null;
  created_at: string;
};

export type CoincidenciaCalidad = {
  id: number;
  tipo: "HASH_IDENTICO" | "MISMA_NORMA" | "CONTENIDO_SIMILAR" | "IDENTIFICADOR_CONFLICTIVO";
  tipo_display: string;
  documento_coincidente: DocumentoCoincidente;
  similitud_titulo: string;
  similitud_contenido: string;
  misma_fecha: boolean;
  mismo_identificador: boolean;
  detalles: Record<string, unknown>;
};

export type ResultadoCalidad = CalidadResumen & {
  hash_contenido: string;
  metricas: {
    caracteres_texto?: number;
    coincidencias?: number;
    confianza_extraccion?: number;
    confianza_ocr?: number | null;
  };
  alertas: AlertaCalidad[];
  coincidencias: CoincidenciaCalidad[];
};

export type DocumentoList = {
  id: number;
  uuid: string;
  codigo_interno: string;
  tipo_origen: DocumentoOrigen;
  tipo_origen_display: string;
  estado: DocumentoEstado;
  estado_display: string;
  nombre_archivo: string;
  fecha_recepcion: string;
  fecha_finalizacion: string | null;
  created_at: string;
};

export type ArchivoDocumento = {
  id: number;
  tipo_archivo: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
  hash_sha256: string;
  created_at: string;
};

export type HistorialDocumento = {
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

export type DocumentoDetail = DocumentoList & {
  archivos: ArchivoDocumento[];
  historial: HistorialDocumento[];
  archivo_original_url: string;
  procesamiento: ProcesamientoResumen | null;
  extraccion: ExtraccionResumen | null;
  calidad: CalidadResumen | null;
  conversion: ConversionResumen | null;
  documento_canonico: number | null;
};

export type DocumentoFilters = {
  q?: string;
  estado?: "" | DocumentoEstado;
  estado_grupo?: "" | DocumentoEstadoGrupo;
  tipo_origen?: "" | DocumentoOrigen;
  fecha_desde?: string;
  fecha_hasta?: string;
  ordering?: string;
  page?: number;
};

export type PaginatedResponse<T> = { count: number; next: string | null; previous: string | null; results: T[] };
