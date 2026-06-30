import Link from "next/link";

import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Scale,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  {
    title: "Expedientes activos",
    value: "42",
    detail: "8 requieren seguimiento esta semana",
    change: "+6%",
    icon: BriefcaseBusiness,
  },
  {
    title: "Audiencias próximas",
    value: "7",
    detail: "3 programadas para las próximas 48 horas",
    change: "Agenda",
    icon: CalendarDays,
  },
  {
    title: "Clientes activos",
    value: "128",
    detail: "12 consultas nuevas este mes",
    change: "+9%",
    icon: Users,
  },
  {
    title: "Documentos pendientes",
    value: "15",
    detail: "5 escritos con vencimiento cercano",
    change: "Prioridad",
    icon: FileText,
  },
];

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

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Scale className="size-5" />
            <span className="font-medium text-sm">Consultor Jurídico</span>
          </div>
          <h1 className="font-semibold text-2xl tracking-tight md:text-3xl">Resumen de gestión legal</h1>
          <p className="max-w-2xl text-muted-foreground text-sm">
            Controla expedientes, plazos procesales, audiencias y documentos desde una vista central.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/calendar">
              <CalendarDays />
              Ver agenda
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/kanban">
              <BriefcaseBusiness />
              Gestionar casos
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-md border bg-muted">
                    <Icon className="size-4 text-muted-foreground" />
                  </span>
                  <Badge variant="outline">{metric.change}</Badge>
                </div>
                <CardDescription>{metric.title}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{metric.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{metric.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
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
                className="grid gap-3 border-b py-4 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span className="font-medium text-sm">{caseItem.code}</span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{caseItem.client}</p>
                  <p className="truncate text-muted-foreground text-xs">{caseItem.matter}</p>
                </div>
                <Badge variant={caseItem.tone}>{caseItem.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximas audiencias</CardTitle>
            <CardDescription>Agenda judicial de los siguientes días.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hearings.map((hearing) => (
              <div key={`${hearing.date}-${hearing.time}`} className="flex gap-3">
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md border bg-muted py-2">
                  <span className="font-semibold text-xs">{hearing.date}</span>
                  <span className="text-muted-foreground text-xs">{hearing.time}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{hearing.title}</p>
                  <p className="text-muted-foreground text-xs">{hearing.case}</p>
                  <p className="truncate text-muted-foreground text-xs">{hearing.court}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documentos pendientes</CardTitle>
            <CardDescription>Escritos y entregables próximos a vencer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingDocuments.map((document) => (
              <div key={document.name} className="flex items-center gap-3 rounded-md border p-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
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
            <CardDescription>Resumen de cumplimiento y carga de trabajo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-md border p-4">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
              <div>
                <p className="font-medium text-sm">Plazos controlados</p>
                <p className="text-muted-foreground text-xs">34 actuaciones dentro de plazo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-4">
              <Clock3 className="mt-0.5 size-5 text-amber-600" />
              <div>
                <p className="font-medium text-sm">Seguimientos</p>
                <p className="text-muted-foreground text-xs">9 tareas pendientes esta semana.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-4 sm:col-span-2">
              <AlertTriangle className="mt-0.5 size-5 text-destructive" />
              <div>
                <p className="font-medium text-sm">Atención requerida</p>
                <p className="text-muted-foreground text-xs">
                  Dos expedientes tienen plazos críticos y requieren revisión prioritaria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
