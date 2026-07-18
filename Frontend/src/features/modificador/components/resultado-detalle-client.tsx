"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileDiff,
  FolderCheck,
  Minus,
  Plus,
  Replace,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { urlDescargaResultado } from "../api/modificador-api";
import { useResultadoDetalle } from "../hooks/use-modificador";
import type { AlertaAuditoria } from "../types/modificador.types";

const estilosContenido = cn(
  "max-w-none text-sm leading-relaxed",
  "[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:font-semibold [&_h1]:text-xl",
  "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-semibold [&_h2]:text-lg",
  "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:font-semibold [&_h3]:text-base",
  "[&_h4]:mt-3 [&_h4]:mb-1.5 [&_h4]:font-medium",
  "[&_p]:my-2 [&_blockquote]:my-1.5 [&_ul]:my-1.5 [&_ul]:pl-4",
  "[&_del]:rounded-sm [&_del]:bg-destructive/10 [&_del]:px-0.5 [&_del]:text-muted-foreground [&_del]:line-through [&_del]:decoration-destructive/60",
  "[&_.ley-texto-vigente]:rounded-md [&_.ley-texto-vigente]:border-l-2 [&_.ley-texto-vigente]:border-emerald-500 [&_.ley-texto-vigente]:bg-emerald-500/10 [&_.ley-texto-vigente]:px-3 [&_.ley-texto-vigente]:py-1.5",
  "[&_aside.ley-marca-cambio]:my-3 [&_aside.ley-marca-cambio]:rounded-md [&_aside.ley-marca-cambio]:border-primary [&_aside.ley-marca-cambio]:border-l-4 [&_aside.ley-marca-cambio]:bg-primary/5 [&_aside.ley-marca-cambio]:px-3 [&_aside.ley-marca-cambio]:py-2 [&_aside.ley-marca-cambio]:font-medium [&_aside.ley-marca-cambio]:text-primary [&_aside.ley-marca-cambio]:text-xs",
);

function iconoAccion(tipo: string) {
  const t = tipo.toUpperCase();
  if (t.includes("INCORPORA") || t.includes("COMPLEMENTA")) return Plus;
  if (t.includes("ELIMINA") || t.includes("DEROG") || t.includes("ABROG")) return Minus;
  return Replace;
}

function AlertaItem({ alerta }: { alerta: AlertaAuditoria }) {
  const critico = alerta.nivel === "critico";
  return (
    <div
      className={cn(
        "rounded-md border p-3",
        critico ? "border-destructive/30 bg-destructive/5" : "border-amber-300/50 bg-amber-500/5",
      )}
    >
      <p className={cn("font-medium text-xs", critico ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
        {alerta.etiqueta}
        {alerta.articulo ? ` · ${alerta.articulo}` : ""}
      </p>
      <p className="mt-1 text-muted-foreground text-xs">{alerta.mensaje}</p>
    </div>
  );
}

export function ResultadoDetalleClient({ id }: { id: number }) {
  const detalle = useResultadoDetalle(id);
  const resultado = detalle.data?.resultado;
  const preinforme = resultado?.preinforme;
  const resumen = preinforme?.resumen_ejecutivo ?? {};

  if (detalle.isError) {
    return (
      <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
        {getApiErrorMessage(detalle.error)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm md:p-8">
        <FileDiff className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
              <BookOpenCheck className="size-3.5" /> Norma consolidada
            </span>
            {resultado ? (
              <>
                <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
                  Ley {resultado.ley_codigo} · versión {resultado.version}
                </h1>
                <p className="max-w-2xl text-primary-foreground/80 text-sm">{resultado.ley_titulo}</p>
              </>
            ) : (
              <Skeleton className="h-9 w-72 bg-primary-foreground/20" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/modificador">
                <ArrowLeft className="size-4" /> Volver
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <a href={urlDescargaResultado(id, "docx")} download>
                <Download className="size-4" /> Word
              </a>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <a href={urlDescargaResultado(id, "pdf")} download>
                <Download className="size-4" /> PDF
              </a>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
        {/* Contenido consolidado */}
        <Card>
          <CardHeader>
            <CardTitle>Texto consolidado</CardTitle>
            <CardDescription>
              El texto <del className="text-destructive line-through decoration-destructive/60">tachado</del> es la
              redacción anterior; el resaltado en verde es el texto vigente incorporado por la norma modificatoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {detalle.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div
                className={estilosContenido}
                // Contenido generado y saneado por nuestro propio backend (html.escape).
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML confiable generado por el motor propio
                dangerouslySetInnerHTML={{ __html: resultado?.contenido_final ?? "" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Panel lateral */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Pre-informe de auditoría</CardTitle>
              <CardDescription>Resumen ejecutivo de los cambios aplicados.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="font-semibold text-2xl tabular-nums">{resumen.articulos_modificados ?? 0}</p>
                  <p className="text-muted-foreground text-xs">Modificados</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-semibold text-2xl tabular-nums">{resumen.articulos_incorporados ?? 0}</p>
                  <p className="text-muted-foreground text-xs">Incorporados</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-semibold text-2xl tabular-nums">{resumen.articulos_derogados ?? 0}</p>
                  <p className="text-muted-foreground text-xs">Derogados</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-semibold text-2xl tabular-nums">{resumen.palabras_cambiadas_aprox ?? 0}</p>
                  <p className="text-muted-foreground text-xs">Palabras (aprox.)</p>
                </div>
              </div>

              {preinforme?.norma_modificatoria?.norma ? (
                <>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">Norma modificatoria</p>
                    <p className="text-muted-foreground text-xs">
                      {preinforme.norma_modificatoria.norma} · {preinforme.norma_modificatoria.fecha}
                    </p>
                    <p className="text-muted-foreground text-xs">{preinforme.norma_modificatoria.descripcion}</p>
                  </div>
                </>
              ) : null}

              {preinforme?.guardado_automatico?.docx ? (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-xs">
                    <FolderCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="font-medium">Guardado automático</p>
                      <p className="break-all text-muted-foreground">{preinforme.guardado_automatico.docx}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cambios aplicados</CardTitle>
              <CardDescription>{preinforme?.total_cambios ?? 0} operación(es) del motor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {detalle.isLoading ? <Skeleton className="h-24 w-full" /> : null}
              {(preinforme?.entradas ?? []).map((entrada) => {
                const Icon = iconoAccion(entrada.tipo_accion);
                const clave = `${entrada.tipo_accion}-${entrada.articulo_referencia}-${entrada.descripcion.slice(0, 40)}`;
                return (
                  <div key={clave} className="flex gap-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0 border-b pb-3 last:border-b-0 last:pb-0">
                      <p className="font-medium text-xs">
                        {entrada.tipo_accion}
                        {entrada.articulo_referencia ? ` · ${entrada.articulo_referencia}` : ""}
                      </p>
                      <p className="mt-0.5 text-muted-foreground text-xs">{entrada.descripcion}</p>
                      {entrada.extracto_quitado ? (
                        <p className="mt-1 text-muted-foreground text-xs">
                          <del className="decoration-destructive/60">{entrada.extracto_quitado.slice(0, 120)}</del>
                        </p>
                      ) : null}
                      {entrada.extracto_agregado ? (
                        <p className="mt-1 text-emerald-700 text-xs dark:text-emerald-300">
                          + {entrada.extracto_agregado.slice(0, 120)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(resultado?.alertas_criticas ?? 0) > 0 ? (
                  <AlertTriangle className="size-4.5 text-destructive" />
                ) : (
                  <CheckCircle2 className="size-4.5 text-emerald-600" />
                )}
                Alertas de verificación
              </CardTitle>
              <CardDescription>
                {(resultado?.alertas_criticas ?? 0) > 0
                  ? "Revise manualmente los puntos marcados antes de aprobar la versión."
                  : "El motor no detectó errores críticos en esta consolidación."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(preinforme?.errores_detectados ?? []).map((alerta) => (
                <AlertaItem key={`err-${alerta.codigo}-${alerta.mensaje.slice(0, 60)}`} alerta={alerta} />
              ))}
              {(preinforme?.advertencias ?? []).map((alerta) => (
                <AlertaItem key={`adv-${alerta.codigo}-${alerta.mensaje.slice(0, 60)}`} alerta={alerta} />
              ))}
              {!detalle.isLoading &&
              !(preinforme?.errores_detectados ?? []).length &&
              !(preinforme?.advertencias ?? []).length ? (
                <p className="text-muted-foreground text-sm">Sin alertas registradas.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
