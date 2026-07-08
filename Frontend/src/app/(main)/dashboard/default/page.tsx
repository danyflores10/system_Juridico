import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Gavel,
  Scale,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { CaseworkActivity } from "./_components/casework-activity";
import { LegalKpiCards } from "./_components/legal-kpi-cards";
import { MatterDistribution } from "./_components/matter-distribution";

const hearings = [
  {
    time: "09:00",
    date: "02 JUL",
    title: "Audiencia preliminar",
    case: "Exp. CJ-2026-0042",
    court: "Juzgado Público Civil 4°",
  },
  {
    time: "11:30",
    date: "03 JUL",
    title: "Conciliación laboral",
    case: "Exp. CJ-2026-0038",
    court: "Juzgado Laboral 2°",
  },
  {
    time: "15:00",
    date: "05 JUL",
    title: "Declaración informativa",
    case: "Exp. CJ-2026-0051",
    court: "Fiscalía Especializada",
  },
  {
    time: "10:00",
    date: "08 JUL",
    title: "Lectura de sentencia",
    case: "Exp. CJ-2026-0029",
    court: "Juzgado Público Civil 2°",
  },
];

const priorityCases = [
  {
    code: "CJ-2026-0042",
    client: "María Fernanda Rojas",
    matter: "Incumplimiento contractual",
    status: "Audiencia próxima",
    tone: "default" as const,
  },
  {
    code: "CJ-2026-0038",
    client: "Constructora Andina S.R.L.",
    matter: "Controversia laboral",
    status: "En conciliación",
    tone: "outline" as const,
  },
  {
    code: "CJ-2026-0051",
    client: "Carlos Eduardo Méndez",
    matter: "Asistencia penal",
    status: "Plazo crítico",
    tone: "destructive" as const,
  },
  {
    code: "CJ-2026-0029",
    client: "Comercial Rivera Ltda.",
    matter: "Cobro ejecutivo",
    status: "En revisión",
    tone: "secondary" as const,
  },
];

const pendingDocuments = [
  { name: "Contestación de demanda", case: "CJ-2026-0042", due: "Vence en 2 días", urgent: true },
  { name: "Memorial de apersonamiento", case: "CJ-2026-0051", due: "Vence en 4 días", urgent: true },
  { name: "Informe jurídico mensual", case: "Cliente corporativo", due: "Vence en 7 días", urgent: false },
];

const teamWorkload = [
  { name: "Daniel W. Flores", role: "Abogado administrador", cases: 18, capacity: 90 },
  { name: "Lucía Paredes", role: "Abogada senior", cases: 14, capacity: 70 },
  { name: "Andrés Quiroga", role: "Abogado junior", cases: 10, capacity: 55 },
];

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-none bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground shadow-sm md:p-8">
        <Scale className="pointer-events-none absolute -right-6 -bottom-8 size-48 rotate-12 text-primary-foreground/10" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 font-medium text-xs uppercase tracking-wide">
              <Scale className="size-3.5" />
              Pantalla principal
            </span>
            <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Resumen de gestión legal</h1>
            <p className="max-w-2xl text-primary-foreground/80 text-sm">
              Controla expedientes, plazos procesales, audiencias y documentos desde una vista central.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/calendar">
                <CalendarDays />
                Ver agenda
              </Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/dashboard/kanban">
                <BriefcaseBusiness />
                Gestionar casos
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <LegalKpiCards />

      {/* Charts */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <CaseworkActivity />
        <MatterDistribution />
      </div>

      {/* Priority cases + hearings */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Expedientes prioritarios</CardTitle>
                <CardDescription>Casos que requieren acción o seguimiento inmediato.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/crm">
                  Ver todos
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {priorityCases.map((caseItem) => (
              <div
                key={caseItem.code}
                className="grid gap-3 border-b py-4 last:border-b-0 sm:grid-cols-[130px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="font-medium font-mono text-muted-foreground text-xs">{caseItem.code}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{caseItem.client}</p>
                  <p className="truncate text-muted-foreground text-xs">{caseItem.matter}</p>
                </div>
                <Badge variant={caseItem.tone} className="w-fit">
                  {caseItem.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Próximas audiencias</CardTitle>
                <CardDescription>Agenda judicial de los siguientes días.</CardDescription>
              </div>
              <Gavel className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hearings.map((hearing) => (
              <div key={`${hearing.date}-${hearing.time}`} className="flex gap-3">
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/50 py-2">
                  <span className="font-semibold text-xs">{hearing.date}</span>
                  <span className="text-muted-foreground text-xs">{hearing.time}</span>
                </div>
                <div className="min-w-0 flex-1 border-b pb-3 last:border-b-0 last:pb-0">
                  <p className="font-medium text-sm">{hearing.title}</p>
                  <p className="text-muted-foreground text-xs">{hearing.case}</p>
                  <p className="truncate text-muted-foreground text-xs">{hearing.court}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Documents + operational status + workload */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Documentos pendientes</CardTitle>
            <CardDescription>Escritos y entregables próximos a vencer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDocuments.map((document) => (
              <div key={document.name} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <FileText className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">{document.name}</p>
                  <p className="text-muted-foreground text-xs">{document.case}</p>
                </div>
                <Badge variant={document.urgent ? "destructive" : "outline"}>{document.due}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
            <CardDescription>Cumplimiento de plazos y carga de trabajo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
              <div>
                <p className="font-medium text-sm">Plazos controlados</p>
                <p className="text-muted-foreground text-xs">34 actuaciones dentro de plazo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Clock3 className="mt-0.5 size-5 text-amber-600" />
              <div>
                <p className="font-medium text-sm">Seguimientos</p>
                <p className="text-muted-foreground text-xs">9 tareas pendientes esta semana.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <AlertTriangle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">Atención requerida</p>
                <p className="text-muted-foreground text-xs">
                  2 expedientes tienen plazos críticos y requieren revisión prioritaria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carga del equipo</CardTitle>
            <CardDescription>Distribución de expedientes por abogado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {teamWorkload.map((member) => (
              <div key={member.name} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{member.name}</p>
                    <p className="truncate text-muted-foreground text-xs">{member.role}</p>
                  </div>
                  <span className="shrink-0 font-medium text-sm tabular-nums">{member.cases} casos</span>
                </div>
                <Progress value={member.capacity} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
