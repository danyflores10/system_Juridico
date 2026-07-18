export type ModificadorStats = {
  leyes_activas: number;
  leyes_abrogadas: number;
  mods_pendientes: number;
  mods_vinculadas: number;
  mods_procesadas: number;
  resultados: number;
  alertas_criticas: number;
};

export type LeyOriginalModificador = {
  id: number;
  codigo: string;
  titulo: string;
  archivo: string;
  estado: "activo" | "inactivo" | "abrogada";
  estado_label: string;
  estado_proceso: "pendiente" | "vinculada" | "modificada";
  estado_proceso_label: string;
  fecha_carga: string;
  versiones: number;
};

export type Modificatoria = {
  id: number;
  archivo: string;
  codigo_detectado: string;
  palabras_clave: string;
  vinculada: boolean;
  ley_id: number | null;
  ley_codigo: string | null;
  ley_titulo: string | null;
  procesado: boolean;
  estado: "pendiente" | "vinculada" | "procesado";
  estado_label: string;
  fecha_carga: string;
};

export type ResumenEjecutivo = {
  articulos_modificados?: number;
  articulos_incorporados?: number;
  articulos_derogados?: number;
  palabras_cambiadas_aprox?: number;
};

export type NormaModificatoriaMeta = {
  tipo?: string;
  norma?: string;
  codigo_norma?: string;
  fecha?: string;
  fecha_iso?: string;
  descripcion?: string;
  ambito?: string;
  rama?: string;
  nombre_original?: string;
};

export type ResultadoResumen = {
  id: number;
  ley_id: number;
  ley_codigo: string;
  ley_titulo: string;
  ley_estado: "activo" | "inactivo" | "abrogada";
  version: number;
  fecha: string;
  es_version_final: boolean;
  archivo_docx: string;
  archivo_pdf: string;
  total_cambios: number;
  resumen_ejecutivo: ResumenEjecutivo;
  alertas_criticas: number;
  advertencias: number;
  norma_modificatoria: NormaModificatoriaMeta;
  archivo_modificatorio: string;
};

export type AlertaAuditoria = {
  nivel: "critico" | "advertencia" | "nota" | "info";
  codigo: string;
  mensaje: string;
  articulo: string;
  norma: string;
  icono: string;
  etiqueta: string;
};

export type EntradaPreinforme = {
  tipo_accion: string;
  descripcion: string;
  extracto_quitado: string;
  extracto_agregado: string;
  articulo_referencia: string;
  norma_fuente: string;
  marcador: string;
};

export type Preinforme = {
  ley_codigo: string;
  ley_titulo: string;
  archivo_modificatorio: string;
  norma_modificatoria: NormaModificatoriaMeta;
  resumen_ejecutivo: ResumenEjecutivo;
  entradas: EntradaPreinforme[];
  total_cambios: number;
  errores_detectados: AlertaAuditoria[];
  advertencias: AlertaAuditoria[];
  guardado_automatico?: { docx?: string; pdf?: string; error?: string };
};

export type ResultadoDetalle = ResultadoResumen & {
  contenido_final: string;
  preinforme: Preinforme;
};

export type RespuestaProcesar = {
  ok: boolean;
  mensaje: string;
  procesados: number;
  vinculadas_auto: number;
  sin_vincular: number;
  errores: string[];
  resultados: ResultadoResumen[];
  stats: ModificadorStats;
};
