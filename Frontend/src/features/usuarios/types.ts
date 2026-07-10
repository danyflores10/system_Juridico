export type RolUsuario = "admin" | "usuario";

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  fecha_registro: string;
  ultimo_acceso: string | null;
}

export interface UsuarioQuery {
  q?: string;
  rol?: RolUsuario | "";
  activo?: "true" | "false" | "";
  page?: number;
}

export interface UsuarioPayload {
  nombre: string;
  apellido?: string;
  email: string;
  rol: RolUsuario;
  activo?: boolean;
  password?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
