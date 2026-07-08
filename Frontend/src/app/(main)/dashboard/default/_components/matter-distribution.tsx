"use client";

import * as React from "react";

import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type MatterKey = "civil" | "laboral" | "penal" | "familiar" | "comercial";

const matterData: { key: MatterKey; materia: string; expedientes: number; percentage: number }[] = [
  { key: "civil", materia: "Civil", expedientes: 16, percentage: 38 },
  { key: "laboral", materia: "Laboral", expedientes: 10, percentage: 24 },
  { key: "penal", materia: "Penal", expedientes: 7, percentage: 17 },
  { key: "familiar", materia: "Familiar", expedientes: 5, percentage: 12 },
  { key: "comercial", materia: "Comercial", expedientes: 4, percentage: 9 },
];

const chartConfig = {
  expedientes: { label: "Expedientes" },
  civil: { color: "var(--chart-1)", label: "Civil" },
  laboral: { color: "var(--chart-2)", label: "Laboral" },
  penal: { color: "var(--chart-3)", label: "Penal" },
  familiar: { color: "var(--chart-4)", label: "Familiar" },
  comercial: { color: "var(--chart-5)", label: "Comercial" },
} satisfies ChartConfig;

const getMatterColor = (key: MatterKey) => {
  const config = chartConfig[key];
  return "color" in config ? config.color : undefined;
};

const chartData = matterData.map((item) => ({ ...item, fill: getMatterColor(item.key) }));

export function MatterDistribution() {
  const total = React.useMemo(() => matterData.reduce((sum, item) => sum + item.expedientes, 0), []);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Expedientes por materia</CardTitle>
        <CardDescription>Distribución de la cartera activa por área del derecho.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-52">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel className="w-44" nameKey="materia" />}
            />
            <Pie
              cornerRadius={6}
              data={chartData}
              dataKey="expedientes"
              innerRadius={60}
              nameKey="materia"
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={4}
            >
              <Label
                content={({ viewBox }) => {
                  if (!(viewBox && "cx" in viewBox && "cy" in viewBox)) return null;
                  return (
                    <text dominantBaseline="middle" textAnchor="middle" x={viewBox.cx} y={viewBox.cy}>
                      <tspan
                        className="fill-foreground font-semibold text-3xl tabular-nums"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        {total}
                      </tspan>
                      <tspan className="fill-muted-foreground text-xs" x={viewBox.cx} y={(viewBox.cy ?? 0) + 22}>
                        expedientes
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        <div className="flex flex-col gap-2.5">
          {chartData.map((item) => (
            <div className="flex items-center justify-between gap-3" key={item.key}>
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="truncate text-sm">{item.materia}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs tabular-nums">{item.expedientes}</span>
                <span className="w-9 text-right font-medium text-sm tabular-nums">{item.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
