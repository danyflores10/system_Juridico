export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type CatalogoResumen = {
  id: number;
  codigo: string;
  nombre: string;
  sigla?: string;
};

export type TipoFuente = "PORTAL_WEB" | "API" | "RSS" | "REPOSITORIO";
export type MotorConsulta = "HTTPX" | "PLAYWRIGHT";
export type FrecuenciaConsulta = "MANUAL" | "DIARIA" | "SEMANAL";
export type EstadoPrueba = "NO_PROBADO" | "DISPONIBLE" | "ERROR";
export type EstadoEjecucion = "EN_PROCESO" | "EXITOSA" | "PARCIAL" | "ERROR";
export type TipoEjecucion = "PRUEBA_CONEXION" | "EJECUCION_MANUAL" | "EJECUCION_PROGRAMADA";
export type EstadoHallazgo = "DESCUBIERTO" | "DESCARGADO" | "DUPLICADO" | "OMITIDO" | "ERROR";

export type FuenteList = {
  id: number;
  codigo: string;
  nombre: string;
  url_base: string;
  tipo_fuente: TipoFuente;
  motor_consulta: MotorConsulta;
  materia_predeterminada: CatalogoResumen | null;
  entidad_emisora_predeterminada: CatalogoResumen | null;
  activa: boolean;
  ultimo_estado_prueba: EstadoPrueba;
  ultima_prueba_en: string | null;
  ultimo_codigo_http: number | null;
  cantidad_secciones: number;
  updated_at: string;
};

export type FuenteSeccion = {
  id: number;
  fuente: number;
  fuente_nombre: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  url_listado: string;
  url_busqueda: string;
  materia_predeterminada: number | null;
  materia_predeterminada_detalle: CatalogoResumen | null;
  configuracion: Record<string, unknown>;
  activa: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type FuenteDetail = FuenteList & {
  descripcion: string;
  url_consulta_principal: string;
  requiere_javascript: boolean;
  requiere_autenticacion: boolean;
  frecuencia_consulta: FrecuenciaConsulta;
  configuracion: Record<string, unknown>;
  orden: number;
  ultimo_mensaje_prueba: string;
  ultimo_error_prueba: string;
  secciones: FuenteSeccion[];
  created_at: string;
};

export type EjecucionFuente = {
  id: number;
  fuente: number;
  fuente_nombre: string;
  seccion: number | null;
  seccion_nombre: string | null;
  tipo_ejecucion: TipoEjecucion;
  estado: EstadoEjecucion;
  inicio: string;
  fin: string | null;
  codigo_http: number | null;
  documentos_encontrados: number;
  documentos_descargados: number;
  documentos_duplicados: number;
  documentos_omitidos: number;
  total_errores: number;
  paginas_revisadas: number;
  tarea_id: string;
  duracion_ms: number | null;
  mensaje: string;
  detalle_error: string;
  solicitado_por: number | null;
  solicitado_por_nombre: string | null;
  created_at: string;
};

export type HallazgoFuente = {
  id: number;
  ejecucion: number;
  fuente: number;
  fuente_nombre: string;
  seccion: number | null;
  seccion_nombre: string | null;
  documento: number | null;
  documento_uuid: string | null;
  documento_codigo: string | null;
  estado: EstadoHallazgo;
  estado_display: string;
  url: string;
  titulo_encontrado: string;
  nombre_archivo: string;
  codigo_http: number | null;
  mime_type: string;
  tamano_bytes: number;
  hash_sha256: string;
  mensaje: string;
  detalle_error: string;
  created_at: string;
};

export type FuentePayload = {
  codigo: string;
  nombre: string;
  descripcion: string;
  url_base: string;
  url_consulta_principal: string;
  tipo_fuente: TipoFuente;
  motor_consulta: MotorConsulta;
  requiere_javascript: boolean;
  requiere_autenticacion: boolean;
  frecuencia_consulta: FrecuenciaConsulta;
  materia_predeterminada: number | null;
  entidad_emisora_predeterminada: number | null;
  configuracion: Record<string, unknown>;
  activa: boolean;
  orden: number;
};

export type FuenteSeccionPayload = {
  fuente: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  url_listado: string;
  url_busqueda: string;
  materia_predeterminada: number | null;
  activa: boolean;
  orden: number;
};

export type FuenteFilters = {
  q?: string;
  activa?: "" | "true" | "false";
  tipo_fuente?: "" | TipoFuente;
  motor_consulta?: "" | MotorConsulta;
  materia_predeterminada?: number | "";
  estado?: "" | EstadoPrueba;
  ordering?: string;
  page?: number;
};

export type PruebaConexionResultado = {
  estado: EstadoPrueba;
  codigo_http: number | null;
  mensaje: string;
  ejecucion_id: number;
};
