import { NextResponse } from "next/server";

import { z } from "zod";

import { buscarNormativas, registrarBusqueda } from "@/server/biblioteca/consultas";

export const runtime = "nodejs";

const esquemaFecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato aaaa-mm-dd")
  .nullable();

const esquemaCriterios = z.object({
  tipos: z.array(z.string().trim().max(10)).max(20).default([]),
  numero: z.string().trim().max(60).default(""),
  fechaDesde: esquemaFecha.default(null),
  fechaHasta: esquemaFecha.default(null),
  titulo: z.string().trim().max(200).default(""),
  materias: z.array(z.string().trim().max(120)).max(50).default([]),
  objeto: z.string().trim().max(400).default(""),
  carpetas: z
    .array(z.enum(["EMITIDA", "ACTUALIZADA"]))
    .min(1)
    .default(["EMITIDA", "ACTUALIZADA"]),
  plan: z.enum(["gratuita", "suscripcion"]).default("gratuita"),
});

export async function POST(solicitud: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await solicitud.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
  }

  const validacion = esquemaCriterios.safeParse(cuerpo);
  if (!validacion.success) {
    return NextResponse.json(
      { error: "Criterios de búsqueda inválidos.", detalles: z.treeifyError(validacion.error) },
      { status: 400 },
    );
  }

  const { plan, ...criterios } = validacion.data;

  try {
    const resultados = await buscarNormativas(criterios);
    await registrarBusqueda(criterios, resultados.length, plan);

    return NextResponse.json({ total: resultados.length, resultados });
  } catch (error) {
    console.error("Error en la búsqueda de normativas:", error);
    return NextResponse.json(
      { error: "No fue posible ejecutar la búsqueda. Verifique la conexión con la base de datos." },
      { status: 500 },
    );
  }
}
