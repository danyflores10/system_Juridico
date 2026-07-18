"use client";

import * as React from "react";

import { useQueries } from "@tanstack/react-query";
import { Area, CartesianGrid, ComposedChart, XAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listarDocumentos } from "@/features/documentos/api/documentos-api";

const monthLabel = new Intl.DateTimeFormat("es-BO", { month: "short" });

function isoDate(value: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/** Últimos 12 meses calendario, del más antiguo al actual. */
function buildMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const label = monthLabel.format(start).replace(".", "");
    return {
      key: `${start.getFullYear()}-${start.getMonth() + 1}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      desde: isoDate(start),
      hasta: isoDate(end),
    };
  });
}

const chartConfig = {
  automatica: {
    label: "Descarga automática",
    color: "var(--chart-1)",
  },
  manual: {
    label: "Carga manual",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const rangeOptions = {
  "12m": { label: "Últimos 12 meses", months: 12 },
  "6m": { label: "Últimos 6 meses", months: 6 },
  "3m": { label: "Últimos 3 meses", months: 3 },
} as const;

type RangeKey = keyof typeof rangeOptions;

export function DocumentosActividad() {
  const [range, setRange] = React.useState<RangeKey>("6m");
  const months = React.useMemo(buildMonths, []);

  const results = useQueries({
    queries: months.flatMap((month) => [
      {
        queryKey: ["documentos", "actividad", month.key, "total"],
        queryFn: () => listarDocumentos({ fecha_desde: month.desde, fecha_hasta: month.hasta, page: 1 }),
        staleTime: 5 * 60 * 1000,
      },
      {
        queryKey: ["documentos", "actividad", month.key, "automatica"],
        queryFn: () =>
          listarDocumentos({
            tipo_origen: "DESCARGA_AUTOMATICA",
            fecha_desde: month.desde,
            fecha_hasta: month.hasta,
            page: 1,
          }),
        staleTime: 5 * 60 * 1000,
      },
    ]),
  });

  const loading = results.some((result) => result.isLoading);

  const fullData = React.useMemo(
    () =>
      months.map((month, index) => {
        const total = results[index * 2]?.data?.count ?? 0;
        const automatica = results[index * 2 + 1]?.data?.count ?? 0;
        return { month: month.label, automatica, manual: Math.max(0, total - automatica) };
      }),
    [months, results],
  );

  const chartData = React.useMemo(() => fullData.slice(-rangeOptions[range].months), [fullData, range]);

  const totals = React.useMemo(
    () =>
      chartData.reduce(
        (acc, point) => {
          acc.automatica += point.automatica;
          acc.manual += point.manual;
          return acc;
        },
        { automatica: 0, manual: 0 },
      ),
    [chartData],
  );

  const totalPeriodo = totals.automatica + totals.manual;
  const automationRate = totalPeriodo > 0 ? Math.round((totals.automatica / totalPeriodo) * 100) : 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Actividad documental</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Documentos recibidos por mes según su origen de ingreso al sistema
          </span>
          <span className="@[540px]/card:hidden">Documentos recibidos por mes</span>
        </CardDescription>
        <CardAction>
          <Select onValueChange={(value) => setRange(value as RangeKey)} value={range}>
            <SelectTrigger className="w-40" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {Object.entries(rangeOptions).map(([value, item]) => (
                  <SelectItem key={value} value={value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="text-muted-foreground text-xs">Recibidos</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-14" />
            ) : (
              <p className="font-semibold text-2xl tabular-nums">{totalPeriodo}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Descarga automática</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-14" />
            ) : (
              <p className="font-semibold text-2xl tabular-nums">{totals.automatica}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Carga manual</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-14" />
            ) : (
              <p className="font-semibold text-2xl tabular-nums">{totals.manual}</p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Nivel de automatización</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-14" />
            ) : (
              <p className="font-semibold text-2xl tabular-nums">{automationRate}%</p>
            )}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
            <ComposedChart data={chartData} margin={{ top: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id="fillAutomatica" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-automatica)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-automatica)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="fillManual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-manual)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-manual)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />

              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />

              <ChartTooltip cursor={false} content={<ChartTooltipContent className="w-56" indicator="line" />} />
              <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-4 justify-end" />} />

              <Area
                dataKey="automatica"
                stackId="documentos"
                type="natural"
                fill="url(#fillAutomatica)"
                stroke="var(--color-automatica)"
                strokeWidth={2}
                dot={false}
                fillOpacity={1}
              />
              <Area
                dataKey="manual"
                stackId="documentos"
                type="natural"
                fill="url(#fillManual)"
                stroke="var(--color-manual)"
                strokeWidth={2}
                dot={false}
                fillOpacity={1}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
