"use client";

import * as React from "react";

import { Label, Pie, PieChart } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

export type FlujoSlice = {
  key: string;
  etapa: string;
  documentos: number;
};

const sliceColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function FlujoDistribucion({ data, loading }: { data: FlujoSlice[]; loading: boolean }) {
  const total = React.useMemo(() => data.reduce((sum, item) => sum + item.documentos, 0), [data]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = { documentos: { label: "Documentos" } };
    data.forEach((item, index) => {
      config[item.key] = { label: item.etapa, color: sliceColors[index % sliceColors.length] };
    });
    return config;
  }, [data]);

  const chartData = React.useMemo(
    () =>
      data
        .map((item, index) => ({ ...item, fill: sliceColors[index % sliceColors.length] }))
        .filter((item) => item.documentos > 0),
    [data],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Documentos por etapa</CardTitle>
        <CardDescription>Distribución real del flujo documental del sistema.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        {loading ? (
          <div className="flex flex-1 flex-col items-center gap-6">
            <Skeleton className="size-52 rounded-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-52">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel className="w-48" nameKey="etapa" />}
                />
                <Pie
                  cornerRadius={6}
                  data={chartData}
                  dataKey="documentos"
                  innerRadius={60}
                  nameKey="etapa"
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
                            documentos
                          </tspan>
                        </text>
                      );
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex flex-col gap-2.5">
              {data.map((item, index) => (
                <div className="flex items-center justify-between gap-3" key={item.key}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: sliceColors[index % sliceColors.length] }}
                    />
                    <span className="truncate text-sm">{item.etapa}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-xs tabular-nums">{item.documentos}</span>
                    <span className="w-9 text-right font-medium text-sm tabular-nums">
                      {total > 0 ? Math.round((item.documentos / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
