"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useQueries } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileDiff,
  FileSearch,
  FileText,
  Globe2,
  LibraryBig,
  type LucideIcon,
  Search,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarDocumentos } from "@/features/documentos/api/documentos-api";
import { DocumentoStatusBadge } from "@/features/documentos/components/documento-status-badge";
import { useDocumentos } from "@/features/documentos/hooks/use-documentos";
import { useResumenFuentes } from "@/features/fuentes/hooks/use-fuentes";
import { useModificadorResumen } from "@/features/modificador/hooks/use-modificador";
import { useResumenRevision } from "@/features/revision/hooks/use-revision";
import { cn } from "@/lib/utils";

import { DocumentosActividad } from "./documentos-actividad";
import { FlujoDistribucion } from "./flujo-distribucion";

const shortDate = new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "short", year: "numeric" });

const pipelineGroups = [
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "NECESITA_REVISION", label: "Necesitan revisión" },
  { value: "PREPARANDO_FINAL", label: "Preparando final" },
  { value: "FINALIZADO", label: "Finalizados" },
  { value: "NECESITA_ATENCION", label: "Necesitan atención" },
] as const;

function useDocumentosPorGrupo() {
  const results = useQueries({
    queries: pipelineGroups.map((group) => ({
      queryKey: ["documentos", "resumen-grupo", group.value],
      queryFn: () => listarDocumentos({ estado_grupo: group.value, page: 1 }),
    })),
  });
  return {
    counts: results.map((result) => result.data?.count ?? 0),
    loading: results.some((result) => result.isLoading),
  };
}

function KpiCard({
  href,
  icon: Icon,
  title,
  value,
  detail,
  loading,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  value: number;
  detail: string;
  loading: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full gap-3 transition-all group-hover:border-primary/40 group-hover:shadow-md">
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4.5" />
            </span>
            <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <CardDescription>{title}</CardDescription>
          {loading ? (
            <Skeleton className="h-9 w-16" />
          ) : (
            <span className="font-semibold text-3xl tabular-nums tracking-tight">{value}</span>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs">{detail}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function ModuleCard({
  href,
  icon: Icon,
  title,
  description,
  stat,
  loading,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  stat: string;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="size-4" />
        </div>
        <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mt-3 font-medium">{title}</div>
      <div className="mt-0.5 text-muted-foreground text-xs">{description}</div>
      {loading ? (
        <Skeleton className="mt-2 h-4 w-24" />
      ) : (
        <div className="mt-2 font-medium text-primary text-xs">{stat}</div>
      )}
    </Link>
  );
}

export function ResumenFuncional() {
  const router = useRouter();
  const documentos = useDocumentos({ ordering: "-fecha_recepcion", page: 1 });
  const grupos = useDocumentosPorGrupo();
  const revision = useResumenRevision();
  const fuentes = useResumenFuentes();
  const modificador = useModificadorResumen();

  const totalDocumentos = documentos.data?.count ?? 0;
  const [porRevisar, listos, conAlertas, bajaConfianza] = revision.values;
  const [fuentesTotal, fuentesActivas, , fuentesError] = fuentes.values;
  const stats = modificador.data?.stats;
  const recentDocuments = documentos.data?.results.slice(0, 6) ?? [];

  const revisionRows = [
    { icon: FileSearch, label: "Por revisar", value: porRevisar, className: "text-primary" },
    { icon: CheckCircle2, label: "Listos para aprobar", value: listos, className: "text-emerald-600" },
    { icon: AlertTriangle, label: "Con observaciones", value: conAlertas, className: "text-amber-600" },
    { icon: ShieldAlert, label: "Datos por verificar", value: bajaConfianza, className: "text-red-600" },
  ];

  return (
    <>
      {/* KPIs reales de los módulos */}
      <div className="grid @5xl/main:grid-cols-4 @xl/main:grid-cols-2 grid-cols-1 gap-4">
        <KpiCard
          href="/dashboard/documentos"
          icon={FileText}
          title="Documentos jurídicos"
          value={totalDocumentos}
          detail={`${grupos.counts[0]} en procesamiento automático`}
          loading={documentos.isLoading}
        />
        <KpiCard
          href="/dashboard/revision-juridica"
          icon={ClipboardCheck}
          title="Pendientes de revisión"
          value={porRevisar}
          detail={`${conAlertas} con observaciones activas`}
          loading={revision.loading}
        />
        <KpiCard
          href="/dashboard/fuentes"
          icon={Globe2}
          title="Fuentes activas"
          value={fuentesActivas}
          detail={`${fuentesTotal} registradas · ${fuentesError} con error de conexión`}
          loading={fuentes.loading}
        />
        <KpiCard
          href="/dashboard/modificador"
          icon={FileDiff}
          title="Normas consolidadas"
          value={stats?.resultados ?? 0}
          detail={`${stats?.mods_pendientes ?? 0} modificatorias pendientes de vincular`}
          loading={modificador.isLoading}
        />
      </div>

      {/* Estadísticas: actividad mensual + distribución por etapa */}
      <div className="grid @4xl/main:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)] gap-4">
        <DocumentosActividad />
        <FlujoDistribucion
          loading={grupos.loading}
          data={pipelineGroups.map((group, index) => ({
            key: group.value,
            etapa: group.label,
            documentos: grupos.counts[index],
          }))}
        />
      </div>

      {/* Módulos funcionales del sistema */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg tracking-tight">Módulos del sistema</h2>
            <p className="text-muted-foreground text-sm">Acceso directo a las herramientas de gestión normativa.</p>
          </div>
        </div>
        <div className="grid @4xl/main:grid-cols-3 gap-3 sm:grid-cols-2">
          <ModuleCard
            href="/dashboard/documentos"
            icon={FileText}
            title="Documentos jurídicos"
            description="Carga, procesamiento OCR y ciclo de vida documental."
            stat={`${totalDocumentos} documentos registrados`}
            loading={documentos.isLoading}
          />
          <ModuleCard
            href="/dashboard/revision-juridica"
            icon={ClipboardCheck}
            title="Revisión jurídica"
            description="Valide fichas propuestas contrastándolas con el PDF original."
            stat={`${porRevisar} esperando una decisión`}
            loading={revision.loading}
          />
          <ModuleCard
            href="/dashboard/fuentes"
            icon={Globe2}
            title="Cargador jurídico"
            description="Fuentes web oficiales y descarga automática de normativa."
            stat={`${fuentesActivas} de ${fuentesTotal} fuentes activas`}
            loading={fuentes.loading}
          />
          <ModuleCard
            href="/dashboard/modificador"
            icon={FileDiff}
            title="Modificador jurídico"
            description="Consolida normas aplicando sus modificatorias vinculadas."
            stat={`${stats?.leyes_activas ?? 0} leyes activas · ${stats?.resultados ?? 0} consolidadas`}
            loading={modificador.isLoading}
          />
          <ModuleCard
            href="/dashboard/buscador"
            icon={Search}
            title="Buscador jurídico"
            description="Búsqueda en el texto completo de la normativa finalizada."
            stat="Consultar biblioteca normativa"
          />
          <ModuleCard
            href="/dashboard/catalogos"
            icon={LibraryBig}
            title="Catálogos jurídicos"
            description="Materias, tipos de norma, efectos normativos y entidades."
            stat="Administrar clasificadores"
          />
        </div>
      </div>

      {/* Últimos documentos + estado de revisión */}
      <div className="grid @4xl/main:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)] gap-4">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Últimos documentos recibidos</CardTitle>
                <CardDescription>Ingresos más recientes por carga manual o descarga automática.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/documentos">
                  Ver todos
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Documento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead className="pr-4 text-right">Recepción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.isLoading
                  ? ["a", "b", "c", "d"].map((key) => (
                      <TableRow key={key}>
                        <TableCell colSpan={4} className="p-4">
                          <Skeleton className="h-10 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {!documentos.isLoading && !recentDocuments.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center">
                      <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
                        <FileText className="size-5 text-muted-foreground" />
                      </div>
                      <div className="mt-3 font-medium">Todavía no hay documentos</div>
                      <div className="mt-1 text-muted-foreground text-sm">
                        Cargue un PDF o ejecute una fuente para comenzar.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {recentDocuments.map((documento) => (
                  <TableRow
                    key={documento.uuid}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/documentos/${documento.uuid}`)}
                  >
                    <TableCell className="max-w-64 pl-4">
                      <p className="truncate font-medium text-sm">{documento.nombre_archivo}</p>
                      <p className="mt-0.5 font-mono text-muted-foreground text-xs">{documento.codigo_interno}</p>
                    </TableCell>
                    <TableCell>
                      <DocumentoStatusBadge estado={documento.estado} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{documento.tipo_origen_display}</TableCell>
                    <TableCell className="pr-4 text-right text-muted-foreground text-sm">
                      {shortDate.format(new Date(documento.fecha_recepcion))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revisión jurídica</CardTitle>
            <CardDescription>Estado actual de la bandeja de decisión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revisionRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center gap-3 rounded-lg border p-3">
                  <Icon className={cn("size-4.5 shrink-0", row.className)} />
                  <p className="min-w-0 flex-1 truncate font-medium text-sm">{row.label}</p>
                  {revision.loading ? (
                    <Skeleton className="h-6 w-8" />
                  ) : (
                    <span className="font-semibold text-lg tabular-nums">{row.value}</span>
                  )}
                </div>
              );
            })}
            <Button asChild className="w-full">
              <Link href="/dashboard/revision-juridica">
                <ClipboardCheck />
                Abrir bandeja de revisión
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
