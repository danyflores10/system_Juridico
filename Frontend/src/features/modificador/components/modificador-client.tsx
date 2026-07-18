"use client";

import * as React from "react";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileDiff,
  FileText,
  Link2,
  Play,
  RefreshCw,
  ScrollText,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { urlDescargaResultado } from "../api/modificador-api";
import {
  useCargarLeyes,
  useCargarModificatorias,
  useDesactivarLey,
  useDesactivarResultado,
  useLeyesModificador,
  useModificatorias,
  useProcesarModificaciones,
  useReintentarVinculacion,
  useResultadosModificador,
  useVincularManual,
} from "../hooks/use-modificador";
import type { LeyOriginalModificador, Modificatoria, ResultadoResumen } from "../types/modificador.types";

const ACEPTA_ARCHIVOS = ".txt,.md,.html,.htm,.pdf,.docx";

function fecha(value: string) {
  return new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function BotonCargar({
  label,
  onFiles,
  loading,
}: {
  label: string;
  onFiles: (files: File[]) => void;
  loading: boolean;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACEPTA_ARCHIVOS}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.target.value = "";
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={loading}>
        <Upload className={cn("size-4", loading && "animate-pulse")} />
        {loading ? "Cargando…" : label}
      </Button>
    </>
  );
}

function EstadoLeyBadge({ ley }: { ley: LeyOriginalModificador }) {
  if (ley.estado === "abrogada") return <Badge variant="destructive">Abrogada</Badge>;
  if (ley.estado === "inactivo") return <Badge variant="secondary">Inactiva</Badge>;
  if (ley.estado_proceso === "modificada")
    return (
      <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/15 dark:text-emerald-300">
        Modificada
      </Badge>
    );
  if (ley.estado_proceso === "vinculada") return <Badge variant="outline">Vinculada</Badge>;
  return <Badge variant="secondary">Pendiente</Badge>;
}

function EstadoModBadge({ mod }: { mod: Modificatoria }) {
  if (mod.estado === "procesado")
    return (
      <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/15 dark:text-emerald-300">
        <CheckCircle2 className="size-3" /> Procesado
      </Badge>
    );
  if (mod.estado === "vinculada")
    return (
      <Badge className="border-primary/30 bg-primary/10 text-primary">
        <Link2 className="size-3" /> Lista para procesar
      </Badge>
    );
  return (
    <Badge className="border-amber-300 bg-amber-500/10 text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/15 dark:text-amber-300">
      <AlertTriangle className="size-3" /> Sin vincular
    </Badge>
  );
}

function FilasSkeleton({ columnas }: { columnas: number }) {
  return (
    <>
      {["a", "b", "c", "d"].map((key) => (
        <TableRow key={key}>
          <TableCell colSpan={columnas} className="p-4">
            <Skeleton className="h-10 w-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function FilaVacia({ columnas, titulo, detalle }: { columnas: number; titulo: string; detalle: string }) {
  return (
    <TableRow>
      <TableCell colSpan={columnas} className="h-48 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
          <FileText className="size-5 text-muted-foreground" />
        </div>
        <div className="mt-3 font-medium">{titulo}</div>
        <div className="mt-1 text-muted-foreground text-sm">{detalle}</div>
      </TableCell>
    </TableRow>
  );
}

export function ModificadorClient() {
  const leyes = useLeyesModificador();
  const mods = useModificatorias();
  const resultados = useResultadosModificador();

  const cargarLeyes = useCargarLeyes();
  const cargarMods = useCargarModificatorias();
  const reintentar = useReintentarVinculacion();
  const vincular = useVincularManual();
  const procesar = useProcesarModificaciones();
  const desactivarLey = useDesactivarLey();
  const desactivarResultado = useDesactivarResultado();

  const stats = resultados.data?.stats ?? mods.data?.stats ?? leyes.data?.stats;
  const leyesActivas = (leyes.data?.leyes ?? []).filter((ley) => ley.estado === "activo");
  const cargando = leyes.isLoading || mods.isLoading || resultados.isLoading;

  const refrescar = () => {
    void leyes.refetch();
    void mods.refetch();
    void resultados.refetch();
  };

  const kpis = [
    {
      label: "Normas originales",
      valor: stats?.leyes_activas ?? 0,
      detalle: `${stats?.leyes_abrogadas ?? 0} abrogada(s)`,
      icon: ScrollText,
    },
    {
      label: "Sin vincular",
      valor: stats?.mods_pendientes ?? 0,
      detalle: "Requieren vinculación",
      icon: AlertTriangle,
    },
    {
      label: "Listas para procesar",
      valor: stats?.mods_vinculadas ?? 0,
      detalle: `${stats?.mods_procesadas ?? 0} ya procesada(s)`,
      icon: Link2,
    },
    {
      label: "Normativa actualizada",
      valor: stats?.resultados ?? 0,
      detalle: `${stats?.alertas_criticas ?? 0} alerta(s) por revisar`,
      icon: BookOpenCheck,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm md:p-8">
        <FileDiff className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
              <FileDiff className="size-3.5" /> Módulo 2 · Modificador jurídico
            </span>
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Modificador jurídico</h1>
            <p className="max-w-2xl text-primary-foreground/80 text-sm">
              Aplique normas abrogatorias y derogatorias sobre la norma original: el texto anterior queda visible y
              tachado, y la norma consolidada se guarda en Word y PDF con la nomenclatura oficial.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={() => procesar.mutate()}
              disabled={procesar.isPending}
            >
              <Play className={cn("size-4", procesar.isPending && "animate-pulse")} />
              {procesar.isPending ? "Procesando…" : "Procesar modificaciones"}
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="flex items-center gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  {cargando ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="font-semibold text-2xl tabular-nums leading-none">{kpi.valor}</p>
                  )}
                  <p className="mt-1 truncate text-muted-foreground text-sm">{kpi.label}</p>
                  <p className="truncate text-muted-foreground text-xs">{kpi.detalle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Flujo */}
      <Tabs defaultValue="originales" className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="originales">1 · Normas originales</TabsTrigger>
            <TabsTrigger value="modificatorias">2 · Modificatorias</TabsTrigger>
            <TabsTrigger value="resultados">3 · Normativa actualizada</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={refrescar} disabled={cargando}>
            <RefreshCw className={cn("size-4", cargando && "animate-spin")} /> Actualizar
          </Button>
        </div>

        {/* ETAPA 1: Normas originales */}
        <TabsContent value="originales" className="mt-0">
          <Card className="gap-0 py-0">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Normas originales</p>
                <p className="text-muted-foreground text-sm">
                  Cargue las leyes base (TXT, PDF o Word). El código de norma se detecta automáticamente.
                </p>
              </div>
              <BotonCargar
                label="Cargar normas originales"
                loading={cargarLeyes.isPending}
                onFiles={(files) => cargarLeyes.mutate(files)}
              />
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Código</TableHead>
                    <TableHead>Norma</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Versiones</TableHead>
                    <TableHead>Carga</TableHead>
                    <TableHead className="pr-4 text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leyes.isLoading ? <FilasSkeleton columnas={6} /> : null}
                  {!leyes.isLoading && !leyes.data?.leyes.length ? (
                    <FilaVacia
                      columnas={6}
                      titulo="Sin normas originales"
                      detalle="Cargue las leyes base para comenzar el flujo de modificación."
                    />
                  ) : null}
                  {leyes.data?.leyes.map((ley) => (
                    <TableRow key={ley.id}>
                      <TableCell className="pl-4 font-medium font-mono text-sm">{ley.codigo}</TableCell>
                      <TableCell className="max-w-96">
                        <p className="truncate font-medium text-sm">{ley.titulo}</p>
                        <p className="truncate text-muted-foreground text-xs">{ley.archivo}</p>
                      </TableCell>
                      <TableCell>
                        <EstadoLeyBadge ley={ley} />
                      </TableCell>
                      <TableCell className="tabular-nums">{ley.versiones}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{fecha(ley.fecha_carga)}</TableCell>
                      <TableCell className="pr-4 text-right">
                        {ley.estado === "activo" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => desactivarLey.mutate(ley.id)}
                            disabled={desactivarLey.isPending}
                          >
                            <Trash2 className="size-4" /> Desactivar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ETAPA 2: Modificatorias */}
        <TabsContent value="modificatorias" className="mt-0">
          <Card className="gap-0 py-0">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Normas modificatorias</p>
                <p className="text-muted-foreground text-sm">
                  Documentos «A» (abrogatorios) o «D» (derogatorios). La vinculación con la norma original es
                  automática; puede corregirla manualmente.
                </p>
              </div>
              <BotonCargar
                label="Cargar modificatorias"
                loading={cargarMods.isPending}
                onFiles={(files) => cargarMods.mutate(files)}
              />
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Documento</TableHead>
                    <TableHead>Palabras clave</TableHead>
                    <TableHead>Norma vinculada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="pr-4 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mods.isLoading ? <FilasSkeleton columnas={5} /> : null}
                  {!mods.isLoading && !mods.data?.modificatorias.length ? (
                    <FilaVacia
                      columnas={5}
                      titulo="Sin documentos modificatorios"
                      detalle="Cargue las normas abrogatorias o derogatorias para vincularlas."
                    />
                  ) : null}
                  {mods.data?.modificatorias.map((mod) => (
                    <TableRow key={mod.id}>
                      <TableCell className="max-w-96 pl-4">
                        <p className="truncate font-medium text-sm">{mod.archivo}</p>
                        <p className="text-muted-foreground text-xs">
                          Código detectado: {mod.codigo_detectado || "—"} · {fecha(mod.fecha_carga)}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-56">
                        <p className="truncate text-muted-foreground text-xs">{mod.palabras_clave || "—"}</p>
                      </TableCell>
                      <TableCell>
                        {mod.ley_codigo ? (
                          <span className="font-medium font-mono text-sm">Ley {mod.ley_codigo}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin vincular</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <EstadoModBadge mod={mod} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {!mod.procesado ? (
                          <div className="flex items-center justify-end gap-2">
                            <Select
                              value=""
                              onValueChange={(value) => vincular.mutate({ id: mod.id, leyId: Number(value) })}
                            >
                              <SelectTrigger size="sm" className="w-36">
                                <SelectValue placeholder="Vincular a…" />
                              </SelectTrigger>
                              <SelectContent>
                                {leyesActivas.map((ley) => (
                                  <SelectItem key={ley.id} value={String(ley.id)}>
                                    Ley {ley.codigo} — {ley.titulo.slice(0, 40)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => reintentar.mutate(mod.id)}
                              disabled={reintentar.isPending}
                            >
                              <RefreshCw className={cn("size-4", reintentar.isPending && "animate-spin")} />
                              Reintentar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Completado</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ETAPA 3: Resultados */}
        <TabsContent value="resultados" className="mt-0">
          <Card className="gap-0 py-0">
            <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Normativa actualizada</p>
                <p className="text-muted-foreground text-sm">
                  Normas consolidadas con el texto anterior tachado. Guardadas automáticamente en Word y PDF por
                  materia.
                </p>
              </div>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Norma consolidada</TableHead>
                    <TableHead>Modificada por</TableHead>
                    <TableHead>Cambios</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead className="pr-4 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.isLoading ? <FilasSkeleton columnas={5} /> : null}
                  {!resultados.isLoading && !resultados.data?.resultados.length ? (
                    <FilaVacia
                      columnas={5}
                      titulo="Aún no hay normas consolidadas"
                      detalle="Pulse «Procesar modificaciones» cuando tenga modificatorias vinculadas."
                    />
                  ) : null}
                  {resultados.data?.resultados.map((res: ResultadoResumen) => (
                    <TableRow key={res.id}>
                      <TableCell className="max-w-96 pl-4">
                        <p className="truncate font-medium text-sm">
                          Ley {res.ley_codigo} · v{res.version}
                          {res.ley_estado === "abrogada" ? (
                            <Badge variant="destructive" className="ml-2 align-middle">
                              Abrogada
                            </Badge>
                          ) : null}
                        </p>
                        <p className="truncate text-muted-foreground text-xs">{res.ley_titulo}</p>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <p className="truncate text-muted-foreground text-xs">
                          {res.norma_modificatoria.norma
                            ? `${res.norma_modificatoria.norma} — ${res.norma_modificatoria.fecha ?? ""}`
                            : res.archivo_modificatorio || "—"}
                        </p>
                        <p className="text-muted-foreground text-xs">{fecha(res.fecha)}</p>
                      </TableCell>
                      <TableCell className="tabular-nums">{res.total_cambios}</TableCell>
                      <TableCell>
                        {res.alertas_criticas > 0 ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="size-3" /> {res.alertas_criticas}
                          </Badge>
                        ) : (
                          <Badge className="border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" /> Sin alertas
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <a href={urlDescargaResultado(res.id, "docx")} download>
                              <Download className="size-4" /> Word
                            </a>
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <a href={urlDescargaResultado(res.id, "pdf")} download>
                              <Download className="size-4" /> PDF
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => desactivarResultado.mutate(res.id)}
                            disabled={desactivarResultado.isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/modificador/resultado/${res.id}`}>
                              Revisar <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
