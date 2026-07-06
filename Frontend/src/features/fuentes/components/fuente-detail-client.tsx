"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowLeft,
  Bot,
  CalendarClock,
  Download,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  Pencil,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/api/client";

import { useEjecuciones, useFuente, useSecciones } from "../hooks/use-fuentes";
import { useFuenteMutations } from "../hooks/use-fuentes-mutations";
import type { EjecucionFuente, FuenteDetail, FuenteSeccion } from "../types/fuentes.types";
import { FuenteEjecucionesTable } from "./fuente-ejecuciones-table";
import { FuenteFormDialog } from "./fuente-form-dialog";
import { FuenteSeccionFormDialog } from "./fuente-seccion-form-dialog";
import { FuenteSeccionesTable } from "./fuente-secciones-table";
import { ConexionStatusBadge, EjecucionStatusBadge, FuenteStatusBadge } from "./fuente-status-badges";

const dateFormatter = new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short" });

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function AutomationPanel({
  source,
  latest,
  onRun,
  onOpen,
  pending,
}: {
  source: FuenteDetail;
  latest?: EjecucionFuente;
  onRun: () => void;
  onOpen: (id: number) => void;
  pending: boolean;
}) {
  const running = latest?.estado === "EN_PROCESO";
  const frequency = { MANUAL: "Solo cuando usted la ejecute", DIARIA: "Revisión automática cada día", SEMANAL: "Revisión automática cada semana" }[source.frecuencia_consulta];
  let ActionIcon = Search;
  let actionLabel = "Buscar ahora";
  if (pending) {
    ActionIcon = LoaderCircle;
    actionLabel = "Iniciando...";
  } else if (running) {
    ActionIcon = Activity;
    actionLabel = "Ver búsqueda en curso";
  }
  return <div className="space-y-4">
    <section className="grid overflow-hidden rounded-2xl border border-indigo-500/20 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
      <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-7 text-white">
        <div className="flex items-start gap-4"><span className="rounded-2xl bg-white/10 p-3 text-indigo-300"><Bot className="size-8" /></span><div><p className="text-indigo-300 text-xs uppercase tracking-[0.2em]">Cargador jurídico</p><h2 className="mt-1 font-semibold text-2xl">Búsqueda automática de normativa</h2><p className="mt-2 max-w-2xl text-slate-300 leading-6">Revisa el portal oficial, encuentra documentos nuevos y los prepara automáticamente.</p></div></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3"><Capability icon={FileSearch} label="Busca normas" /><Capability icon={ShieldCheck} label="Evita repetidos" /><Capability icon={Download} label="Guarda documentos" /></div>
      </div>
      <div className="flex flex-col justify-between bg-muted/20 p-6">
        <div><p className="text-muted-foreground text-xs uppercase tracking-widest">Programación</p><div className="mt-3 flex items-center gap-3"><span className="rounded-xl bg-indigo-500/10 p-3 text-indigo-600"><CalendarClock className="size-6" /></span><div><p className="font-semibold">{frequency}</p><p className="text-muted-foreground text-sm">El sistema realizará la revisión automáticamente.</p></div></div></div>
        <Button className="mt-6 w-full" size="lg" disabled={!source.activa || source.requiere_autenticacion || pending} onClick={running && latest ? () => onOpen(latest.id) : onRun}><ActionIcon className={pending || running ? "animate-spin" : undefined} />{actionLabel}</Button>
        {!source.activa ? <p className="mt-3 text-center text-destructive text-xs">Active la fuente para poder ejecutarla.</p> : null}
        {source.requiere_autenticacion ? <p className="mt-3 text-center text-amber-700 text-xs">Esta fuente necesita un adaptador de autenticación antes de ejecutarse.</p> : null}
      </div>
    </section>

    {latest ? <Card className="overflow-hidden"><CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Última búsqueda</CardTitle><CardDescription>{dateFormatter.format(new Date(latest.inicio))} · {latest.seccion_nombre ?? "Toda la fuente"}</CardDescription></div><EjecucionStatusBadge estado={latest.estado} /></div></CardHeader><CardContent className="p-0"><div className="grid gap-0 sm:grid-cols-4"><RunMetric label="Encontrados" value={latest.documentos_encontrados} /><RunMetric label="Nuevos" value={latest.documentos_descargados} accent="emerald" /><RunMetric label="Duplicados" value={latest.documentos_duplicados} accent="amber" /><RunMetric label="Errores" value={latest.total_errores} accent="red" /></div>{running ? <div className="border-t px-5 py-4"><div className="mb-2 flex justify-between text-sm"><span>Revisión en segundo plano</span><span className="text-muted-foreground">Actualización automática</span></div><Progress value={62} className="h-2" /></div> : null}<div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/10 px-5 py-4"><p className="text-muted-foreground text-sm">{latest.mensaje || "Ejecución registrada."}</p><Button variant="outline" onClick={() => onOpen(latest.id)}>Ver resultados <ExternalLink /></Button></div></CardContent></Card> : <Card><CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center"><span className="rounded-2xl bg-muted p-4"><FileSearch className="size-8 text-muted-foreground" /></span><h3 className="font-semibold text-lg">Esta fuente todavía no fue revisada</h3><p className="max-w-lg text-muted-foreground text-sm">Ejecute la primera búsqueda para comprobar qué documentos publica el portal.</p></CardContent></Card>}
  </div>;
}

function Capability({ icon: Icon, label }: { icon: typeof Search; label: string }) { return <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm"><Icon className="size-4 text-indigo-300" /> {label}</div>; }
function RunMetric({ label, value, accent = "slate" }: { label: string; value: number; accent?: "slate" | "emerald" | "amber" | "red" }) { const colors = { slate: "text-foreground", emerald: "text-emerald-600", amber: "text-amber-600", red: "text-red-600" }; return <div className="border-b p-5 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"><p className="text-muted-foreground text-xs uppercase">{label}</p><p className={`mt-1 font-semibold text-2xl tabular-nums ${colors[accent]}`}>{value}</p></div>; }

export function FuenteDetailClient({ id }: { id: number }) {
  const router = useRouter();
  const source = useFuente(id);
  const sections = useSecciones(id, 1);
  const executions = useEjecuciones(id, 1);
  const mutations = useFuenteMutations();
  const [editOpen, setEditOpen] = React.useState(false);
  const [sectionOpen, setSectionOpen] = React.useState(false);
  const [editingSection, setEditingSection] = React.useState<FuenteSeccion | null>(null);

  async function testConnection() {
    try {
      const result = await mutations.test.mutateAsync(id);
      if (result.estado === "DISPONIBLE") toast.success(result.mensaje, { description: `HTTP ${result.codigo_http}` });
      else toast.error(result.mensaje);
    } catch (error) {
      toast.error("No se pudo probar la conexión.", { description: getApiErrorMessage(error) });
    }
  }

  async function runDownload(sectionId?: number) {
    try {
      const execution = await mutations.download.mutateAsync({ id, seccion: sectionId });
      toast.success("Búsqueda automática iniciada.", {
        description: sectionId ? "Se revisará únicamente la sección seleccionada." : "Se revisará toda la fuente.",
      });
      router.push(`/dashboard/fuentes/${id}/ejecuciones/${execution.id}`);
    } catch (error) {
      toast.error("No se pudo iniciar la búsqueda.", { description: getApiErrorMessage(error) });
    }
  }

  if (source.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (source.isError || !source.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar la fuente</AlertTitle>
        <AlertDescription>{getApiErrorMessage(source.error)}</AlertDescription>
      </Alert>
    );
  }
  const item = source.data;
  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Inicio</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/fuentes">Fuentes</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{item.codigo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/fuentes")}>
            <ArrowLeft />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-semibold text-2xl tracking-tight">{item.nombre}</h1>
              <FuenteStatusBadge active={item.activa} />
              <ConexionStatusBadge estado={item.ultimo_estado_prueba} />
            </div>
            <p className="mt-1 font-mono text-muted-foreground text-sm">{item.codigo}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil /> Editar
          </Button>
          <Button disabled={!item.activa || item.requiere_autenticacion || mutations.download.isPending} onClick={() => void runDownload()}>
            {mutations.download.isPending ? <LoaderCircle className="animate-spin" /> : <Search />}
            {mutations.download.isPending ? "Iniciando..." : "Buscar normativa"}
          </Button>
        </div>
      </div>
      <Tabs defaultValue="descargas" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="descargas">Descarga automática</TabsTrigger>
          <TabsTrigger value="general">Información general</TabsTrigger>
          <TabsTrigger value="secciones">
            Secciones <Badge variant="secondary">{item.cantidad_secciones}</Badge>
          </TabsTrigger>
          <TabsTrigger value="historial">Historial de ejecuciones</TabsTrigger>
          <TabsTrigger value="tecnica">Configuración técnica</TabsTrigger>
        </TabsList>
        <TabsContent value="descargas">
          <AutomationPanel
            source={item}
            latest={executions.data?.results.find((execution) => execution.tipo_ejecucion !== "PRUEBA_CONEXION")}
            onRun={() => void runDownload()}
            onOpen={(executionId) => router.push(`/dashboard/fuentes/${id}/ejecuciones/${executionId}`)}
            pending={mutations.download.isPending}
          />
        </TabsContent>
        <TabsContent value="general" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Información de la fuente</CardTitle>
              <CardDescription>{item.descripcion || "Sin descripción registrada."}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-6 sm:grid-cols-2">
                <InfoItem
                  label="URL base"
                  value={
                    <a
                      href={item.url_base}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Abrir portal <ExternalLink className="size-3" />
                    </a>
                  }
                />
                <InfoItem
                  label="URL de consulta"
                  value={
                    item.url_consulta_principal ? (
                      <a
                        href={item.url_consulta_principal}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Abrir consulta
                      </a>
                    ) : (
                      "Usa la URL base"
                    )
                  }
                />
                <InfoItem label="Tipo de fuente" value={item.tipo_fuente} />
                <InfoItem label="Motor" value={item.motor_consulta} />
                <InfoItem label="Frecuencia" value={item.frecuencia_consulta} />
                <InfoItem label="Materia" value={item.materia_predeterminada?.nombre ?? "Sin asignar"} />
                <InfoItem
                  label="Entidad emisora"
                  value={item.entidad_emisora_predeterminada?.nombre ?? "Sin asignar"}
                />
                <InfoItem label="Requiere autenticación" value={item.requiere_autenticacion ? "Sí" : "No"} />
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Última comprobación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ConexionStatusBadge estado={item.ultimo_estado_prueba} />
              <InfoItem
                label="Fecha"
                value={item.ultima_prueba_en ? dateFormatter.format(new Date(item.ultima_prueba_en)) : "Nunca probada"}
              />
              <InfoItem label="Código HTTP" value={item.ultimo_codigo_http ? `HTTP ${item.ultimo_codigo_http}` : "—"} />
              <InfoItem label="Mensaje" value={item.ultimo_mensaje_prueba || "Sin pruebas"} />
              {item.ultimo_error_prueba ? (
                <p className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">{item.ultimo_error_prueba}</p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="secciones">
          <FuenteSeccionesTable
            sections={sections.data?.results ?? []}
            onRun={(section) => void runDownload(section.id)}
            running={mutations.download.isPending}
            onCreate={() => {
              setEditingSection(null);
              setSectionOpen(true);
            }}
            onEdit={(section) => {
              setEditingSection(section);
              setSectionOpen(true);
            }}
          />
        </TabsContent>
        <TabsContent value="historial">
          <FuenteEjecucionesTable
            executions={executions.data?.results ?? []}
            onOpen={(execution) => router.push(`/dashboard/fuentes/${id}/ejecuciones/${execution.id}`)}
          />
        </TabsContent>
        <TabsContent value="tecnica" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros técnicos</CardTitle>
              <CardDescription>Configuración reservada para futuras integraciones.</CardDescription>
              <div className="pt-2"><Button variant="outline" disabled={mutations.test.isPending} onClick={() => void testConnection()}><Activity className={mutations.test.isPending ? "animate-pulse" : undefined} />{mutations.test.isPending ? "Probando..." : "Probar conexión"}</Button></div>
            </CardHeader>
            <CardContent>
              <pre className="min-h-32 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs">
                {JSON.stringify(item.configuracion, null, 2)}
              </pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Capacidades</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5">
                <InfoItem label="Requiere JavaScript" value={item.requiere_javascript ? "Sí" : "No"} />
                <InfoItem label="Requiere autenticación" value={item.requiere_autenticacion ? "Sí" : "No"} />
                <InfoItem label="Orden" value={item.orden} />
                <InfoItem label="Creada" value={dateFormatter.format(new Date(item.created_at))} />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <FuenteFormDialog sourceId={id} open={editOpen} onOpenChange={setEditOpen} />
      <FuenteSeccionFormDialog
        fuenteId={id}
        section={editingSection}
        open={sectionOpen}
        onOpenChange={setSectionOpen}
      />
    </div>
  );
}
