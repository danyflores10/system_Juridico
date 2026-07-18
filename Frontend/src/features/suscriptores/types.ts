export type EstadoSuscripcion = "pendiente_pago" | "activa" | "vencida" | "cancelada";

export type CodigoPlan = "gratuito" | "estudiantil" | "profesional" | "consultora" | "empresarial";

export interface ClienteResumen {
  nombre_completo: string;
  email: string;
  whatsapp: string;
  canal_contacto: string;
  canal_contacto_display: string;
}

export interface UltimoPago {
  estado: "pendiente" | "pagado" | "expirado" | "error";
  metodo: string;
  forma_pago: string;
  monto: string;
  pagado_en: string | null;
  creado_en: string;
}

export interface Suscriptor {
  id: number;
  cliente: ClienteResumen;
  plan: string;
  plan_codigo: CodigoPlan;
  periodicidad: "mensual" | "semestral" | "anual";
  precio: string;
  estado: EstadoSuscripcion;
  dispositivos: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  creado_en: string;
  credenciales_total: number;
  credenciales_vinculadas: number;
  ultimo_pago: UltimoPago | null;
}

export interface SuscriptorQuery {
  q?: string;
  estado?: EstadoSuscripcion | "";
  plan?: CodigoPlan | "";
  page?: number;
}

export interface ResumenSuscriptores {
  clientes: number;
  activas: number;
  pendientes: number;
  vencidas: number;
  ingresos_cobrados: string;
}
