export type RolUsuario = "admin" | "usuario";

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  avatar: string | null;
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
  // Foto: File = subir nueva, null = quitar la actual, undefined = sin cambios.
  avatar?: File | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
