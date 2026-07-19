import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE, getDjangoBaseUrl, REFRESH_COOKIE, renovarTokens } from "@/server/auth/session";
import { extraerTexto } from "@/server/biblioteca/extraer-texto";
import { obtenerPool } from "@/server/db";

export const runtime = "nodejs";

const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024;
const MAXIMO_PAGINAS = 50;

interface CatalogoFinalizado {
  id: number;
  codigo: string;
  nombre: string;
}

interface ArchivoFinalizadoDjango {
  uuid: string;
  codigo_interno: string;
  numero: string;
  fecha_emision: string | null;
  titulo: string;
  titulo_archivo?: string;
  objeto_resumido: string;
  materia: CatalogoFinalizado | null;
  tipo_norma_abreviatura?: string;
  efecto_normativo_abreviatura?: string;
  conversion: {
    nombre_archivo_pdf: string;
    tamano_pdf_bytes: number;
    archivo_pdf_url: string | null;
  } | null;
}

interface PaginaFinalizados {
  count: number;
  next: string | null;
  results: ArchivoFinalizadoDjango[];
}

interface ErrorSincronizacion {
  documento: string;
  motivo: string;
}

/** Cliente mínimo hacia Django que renueva el token una vez si el access expiró. */
async function crearClienteDjango() {
  const almacen = await cookies();
  let access = almacen.get(ACCESS_COOKIE)?.value ?? null;
  const refresh = almacen.get(REFRESH_COOKIE)?.value ?? null;
  let renovado = false;

  async function solicitar(ruta: string): Promise<Response> {
    const pedir = (token: string | null) =>
      fetch(`${getDjangoBaseUrl()}${ruta}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });

    let respuesta = await pedir(access);
    if ((respuesta.status === 401 || respuesta.status === 403) && refresh && !renovado) {
      renovado = true;
      const tokens = await renovarTokens(refresh);
      if (tokens) {
        access = tokens.access;
        respuesta = await pedir(access);
      }
    }
    return respuesta;
  }

  return { solicitar };
}

/** Divide el nombre nomenclado en segmentos ("Efecto; Tipo; Número; …"). */
function segmentosNombre(nombre: string): string[] {
  const punto = nombre.lastIndexOf(".");
  const base = punto >= 0 ? nombre.slice(0, punto) : nombre;
  return base.split(";").map((parte) => parte.trim());
}

/**
 * Incorpora a la biblioteca del buscador los documentos finalizados del
 * cargador jurídico (Módulo 1). Toma la ficha jurídica aprobada como fuente
 * de los criterios de búsqueda y guarda el PDF de consulta en la carpeta
 * "Normativa emitida". La operación es idempotente: los documentos ya
 * incorporados se omiten.
 */
export async function POST() {
  const cliente = await crearClienteDjango();
  const pool = obtenerPool();

  const documentos: ArchivoFinalizadoDjango[] = [];
  let pagina = 1;
  let siguiente = true;

  while (siguiente && pagina <= MAXIMO_PAGINAS) {
    const respuesta = await cliente.solicitar(`/documentos/archivo-finalizado/?page=${pagina}`).catch(() => null);
    if (!respuesta) {
      return NextResponse.json(
        { error: "No se pudo conectar con el módulo de documentos. Verifique que el backend esté activo." },
        { status: 502 },
      );
    }
    if (respuesta.status === 401 || respuesta.status === 403) {
      return NextResponse.json(
        { error: "Su sesión no permite consultar el archivo finalizado. Inicie sesión nuevamente." },
        { status: 401 },
      );
    }
    if (!respuesta.ok) {
      return NextResponse.json(
        { error: `El módulo de documentos respondió con el estado ${respuesta.status}.` },
        { status: 502 },
      );
    }

    const datos = (await respuesta.json()) as PaginaFinalizados;
    documentos.push(...(datos.results ?? []));
    siguiente = Boolean(datos.next);
    pagina += 1;
  }

  let incorporados = 0;
  let omitidos = 0;
  const errores: ErrorSincronizacion[] = [];

  for (const documento of documentos) {
    const conversion = documento.conversion;
    if (!conversion?.nombre_archivo_pdf || !conversion.archivo_pdf_url) {
      errores.push({ documento: documento.codigo_interno, motivo: "No tiene un PDF de consulta disponible." });
      continue;
    }

    const nombreArchivo = conversion.nombre_archivo_pdf;
    const existente = await pool.query(
      `SELECT id FROM public.normativas WHERE carpeta = 'EMITIDA' AND nombre_archivo = $1`,
      [nombreArchivo],
    );
    if (existente.rowCount && existente.rowCount > 0) {
      omitidos += 1;
      continue;
    }

    if (!documento.fecha_emision) {
      errores.push({ documento: documento.codigo_interno, motivo: "La ficha no registra fecha de emisión." });
      continue;
    }
    if (conversion.tamano_pdf_bytes > TAMANO_MAXIMO_BYTES) {
      errores.push({ documento: documento.codigo_interno, motivo: "El PDF supera el límite de 25 MB." });
      continue;
    }

    const descarga = await cliente.solicitar(`/documentos/${documento.uuid}/archivo-pdf-consulta/`).catch(() => null);
    if (!descarga?.ok) {
      errores.push({ documento: documento.codigo_interno, motivo: "No se pudo descargar el PDF de consulta." });
      continue;
    }
    const contenido = Buffer.from(await descarga.arrayBuffer());

    let contenidoTexto = "";
    try {
      contenidoTexto = await extraerTexto(contenido, "pdf");
    } catch (error) {
      console.error(`No fue posible extraer el texto de ${documento.codigo_interno}:`, error);
    }

    const segmentos = segmentosNombre(nombreArchivo);
    const efecto = documento.efecto_normativo_abreviatura?.trim() || segmentos[0] || "V";
    const tipoNorma = (documento.tipo_norma_abreviatura?.trim() || segmentos[1] || "L").toUpperCase();
    const titulo = documento.titulo_archivo?.trim() || documento.titulo.trim() || "Documento jurídico";
    const objeto = documento.objeto_resumido.trim() || titulo;
    const materiaFicha = documento.materia === null ? "" : documento.materia.nombre;
    const materia = materiaFicha.trim() || segmentos[6] || "Sin materia";

    try {
      const insercion = await pool.query(
        `
        INSERT INTO public.normativas (
          carpeta, efecto, tipo_norma, numero, fecha_promulgacion, titulo,
          objeto_resumido, materia, nombre_archivo, extension, mime_type,
          tamano_bytes, contenido_texto, archivo
        )
        VALUES ('EMITIDA', $1, $2, $3, $4, $5, $6, $7, $8, 'pdf', 'application/pdf', $9, $10, $11)
        ON CONFLICT (carpeta, nombre_archivo) DO NOTHING
        `,
        [
          efecto,
          tipoNorma,
          documento.numero || "S/N",
          documento.fecha_emision,
          titulo,
          objeto,
          materia,
          nombreArchivo,
          contenido.byteLength,
          contenidoTexto,
          contenido,
        ],
      );
      if (insercion.rowCount && insercion.rowCount > 0) incorporados += 1;
      else omitidos += 1;
    } catch (error) {
      console.error(`Error al incorporar ${documento.codigo_interno}:`, error);
      errores.push({ documento: documento.codigo_interno, motivo: "No se pudo guardar en la biblioteca." });
    }
  }

  return NextResponse.json({ total: documentos.length, incorporados, omitidos, errores });
}
