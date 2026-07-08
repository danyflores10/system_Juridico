import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  type LucideIcon,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

type Kpi = {
  title: string;
  value: string;
  icon: LucideIcon;
  trend: string;
  trendDirection: "up" | "down";
  detail: string;
};

const kpis: Kpi[] = [
  {
    title: "Expedientes activos",
    value: "42",
    icon: BriefcaseBusiness,
    trend: "+6%",
    trendDirection: "up",
    detail: "8 requieren seguimiento esta semana",
  },
  {
    title: "Audiencias próximas",
    value: "7",
    icon: CalendarDays,
    trend: "+2",
    trendDirection: "up",
    detail: "3 programadas en las próximas 48 horas",
  },
  {
    title: "Clientes activos",
    value: "128",
    icon: Users,
    trend: "+9%",
    trendDirection: "up",
    detail: "12 consultas nuevas este mes",
  },
  {
    title: "Documentos pendientes",
    value: "15",
    icon: FileText,
    trend: "-4",
    trendDirection: "down",
    detail: "5 escritos con vencimiento cercano",
  },
];

export function LegalKpiCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const TrendIcon = kpi.trendDirection === "up" ? TrendingUp : TrendingDown;
        return (
          <Card key={kpi.title} className="gap-3">
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4.5" />
                </span>
                <Badge
                  variant="outline"
                  className={
                    kpi.trendDirection === "up"
                      ? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "border-destructive/20 bg-destructive/10 text-destructive"
                  }
                >
                  <TrendIcon className="size-3" />
                  {kpi.trend}
                </Badge>
              </div>
              <CardDescription>{kpi.title}</CardDescription>
              <span className="font-semibold text-3xl tabular-nums tracking-tight">{kpi.value}</span>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-xs">{kpi.detail}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
