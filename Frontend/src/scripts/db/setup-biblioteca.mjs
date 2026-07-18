/**
 * Crea (o actualiza) el esquema del Módulo 3 — Buscador Jurídico
 * en la base de datos systemJuridico.
 *
 * Uso: npm run db:setup
 */

import pg from "pg";

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directorio = path.dirname(fileURLToPath(import.meta.url));
const cadenaConexion = process.env.DATABASE_URL ?? "postgresql://postgres:123456789@localhost:5432/systemJuridico";

async function principal() {
  const cliente = new pg.Client({ connectionString: cadenaConexion });
  await cliente.connect();

  try {
    const sql = readFileSync(path.join(directorio, "schema-biblioteca.sql"), "utf-8");
    await cliente.query(sql);

    const { rows } = await cliente.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
    );

    console.log("Esquema de la biblioteca creado/actualizado correctamente.");
    console.log("Tablas en systemJuridico:", rows.map((fila) => fila.table_name).join(", "));
  } finally {
    await cliente.end();
  }
}

principal().catch((error) => {
  console.error("Error al preparar la base de datos:", error.message);
  process.exitCode = 1;
});
