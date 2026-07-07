import { Pool } from "pg";

const CADENA_CONEXION_LOCAL = "postgresql://postgres:123456789@localhost:5432/systemJuridico";

const globalConPool = globalThis as unknown as { __poolSystemJuridico?: Pool };

/**
 * Pool de conexiones a PostgreSQL (base de datos systemJuridico).
 * Se reutiliza entre recargas de Next.js en desarrollo para no agotar conexiones.
 */
export function obtenerPool(): Pool {
  globalConPool.__poolSystemJuridico ??= new Pool({
    connectionString: process.env.DATABASE_URL ?? CADENA_CONEXION_LOCAL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return globalConPool.__poolSystemJuridico;
}
