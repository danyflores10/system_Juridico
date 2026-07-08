"use client";

import * as React from "react";

import { Area, CartesianGrid, ComposedChart, Line, XAxis } from "recharts";

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

type ActivityPoint = {
  month: string;
  ingresados: number;
  resueltos: number;
  audiencias: number;
};

const yearData: ActivityPoint[] = [
  { month: "Ago", ingresados: 18, resueltos: 12, audiencias: 9 },
  { month: "Sep", ingresados: 22, resueltos: 16, audiencias: 11 },
  { month: "Oct", ingresados: 19, resueltos: 20, audiencias: 8 },
  { month: "Nov", ingresados: 26, resueltos: 18, audiencias: 13 },
  { month: "Dic", ingresados: 15, resueltos: 21, audiencias: 7 },
  { month: "Ene", ingresados: 24, resueltos: 19, audiencias: 12 },
  { month: "Feb", ingresados: 28, resueltos: 23, audiencias: 14 },
  { month: "Mar", ingresados: 21, resueltos: 25, audiencias: 10 },
  { month: "Abr", ingresados: 30, resueltos: 22, audiencias: 15 },
  { month: "May", ingresados: 27, resueltos: 26, audiencias: 13 },
  { month: "Jun", ingresados: 33, resueltos: 28, audiencias: 16 },
  { month: "Jul", ingresados: 25, resueltos: 24, audiencias: 12 },
];

const chartConfig = {
  ingresados: {
    label: "Expedientes ingresados",
    color: "var(--chart-1)",
  },
  resueltos: {
    label: "Expedientes resueltos",
    color: "var(--chart-2)",
  },
  audiencias: {
    label: "Audiencias",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const rangeOptions = {
  "12m": { label: "Últimos 12 meses", months: 12 },
  "6m": { label: "Últimos 6 meses", months: 6 },
  "3m": { label: "Últimos 3 meses", months: 3 },
} as const;

type RangeKey = keyof typeof rangeOptions;

export function CaseworkActivity() {
  const [range, setRange] = React.useState<RangeKey>("12m");

  const chartData = React.useMemo(() => {
    const months = rangeOptions[range].months;
    return yearData.slice(-months);
  }, [range]);

  const totals = React.useMemo(() => {
    return chartData.reduce(
      (acc, point) => {
        acc.ingresados += point.ingresados;
        acc.resueltos += point.resueltos;
        return acc;
      },
      { ingresados: 0, resueltos: 0 },
    );
  }, [chartData]);

  const resolutionRate = totals.ingresados > 0 ? Math.round((totals.resueltos / totals.ingresados) * 100) : 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Actividad de expedientes</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Ingresos, resoluciones y audiencias en el periodo seleccionado
          </span>
          <span className="@[540px]/card:hidden">Ingresos y resoluciones</span>
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
            <p className="text-muted-foreground text-xs">Ingresados</p>
            <p className="font-semibold text-2xl tabular-nums">{totals.ingresados}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Resueltos</p>
            <p className="font-semibold text-2xl tabular-nums">{totals.resueltos}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Tasa de resolución</p>
            <p className="font-semibold text-2xl tabular-nums">{resolutionRate}%</p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
          <ComposedChart data={chartData} margin={{ top: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id="fillIngresados" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ingresados)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-ingresados)" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="fillResueltos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-resueltos)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-resueltos)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />

            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />

            <ChartTooltip cursor={false} content={<ChartTooltipContent className="w-52" indicator="line" />} />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-4 justify-end" />} />

            <Area
              dataKey="ingresados"
              type="natural"
              fill="url(#fillIngresados)"
              stroke="var(--color-ingresados)"
              strokeWidth={2}
              dot={false}
              fillOpacity={1}
            />
            <Area
              dataKey="resueltos"
              type="natural"
              fill="url(#fillResueltos)"
              stroke="var(--color-resueltos)"
              strokeWidth={2}
              dot={false}
              fillOpacity={1}
            />
            <Line
              dataKey="audiencias"
              type="natural"
              stroke="var(--color-audiencias)"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
