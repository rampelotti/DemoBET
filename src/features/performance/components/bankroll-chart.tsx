"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BankrollPoint } from "@/features/performance/types";
import { cn } from "@/lib/utils";

const coinsFormatter = new Intl.NumberFormat("pt-BR");

interface BankrollChartProps {
  data: BankrollPoint[];
}

interface ChartPoint {
  x: number;
  y: number;
  label: string;
  balance: number;
}

export function BankrollChart({ data }: BankrollChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (data.length === 0) {
      return null;
    }

    const width = 720;
    const height = 220;
    const padding = { top: 16, right: 16, bottom: 28, left: 8 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const balances = data.map((point) => point.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = max - min || 1;

    const points: ChartPoint[] = data.map((point, index) => {
      const x = padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
      const y = padding.top + innerHeight - ((point.balance - min) / range) * innerHeight;
      return { x, y, label: point.date, balance: point.balance };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const areaPath = [
      linePath,
      `L ${points[points.length - 1].x} ${padding.top + innerHeight}`,
      `L ${points[0].x} ${padding.top + innerHeight}`,
      "Z",
    ].join(" ");

    const startBalance = data[0].balance;
    const endBalance = data[data.length - 1].balance;
    const change = endBalance - startBalance;

    return { width, height, points, linePath, areaPath, min, max, startBalance, endBalance, change };
  }, [data]);

  if (!chart) {
    return null;
  }

  const activePoint = activeIndex !== null ? chart.points[activeIndex] : null;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Evolução da banca</CardTitle>
          <CardDescription>Saldo em Coins nos últimos 30 dias</CardDescription>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Início: </span>
            <span className="font-medium">{coinsFormatter.format(chart.startBalance)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Atual: </span>
            <span className="font-medium">{coinsFormatter.format(chart.endBalance)}</span>
          </div>
          <div
            className={cn(
              "font-semibold",
              chart.change >= 0 ? "text-emerald-600" : "text-primary"
            )}
          >
            {chart.change >= 0 ? "+" : ""}
            {coinsFormatter.format(chart.change)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chart.width} ${chart.height}`}
            className="h-auto min-w-[520px] w-full"
            role="img"
            aria-label="Gráfico de evolução da banca"
          >
            <defs>
              <linearGradient id="bankroll-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = 16 + (220 - 16 - 28) * ratio;
              return (
                <line
                  key={ratio}
                  x1={8}
                  x2={712}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              );
            })}

            <path d={chart.areaPath} fill="url(#bankroll-gradient)" />
            <path
              d={chart.linePath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {chart.points.map((point, index) => (
              <circle
                key={point.label}
                cx={point.x}
                cy={point.y}
                r={activeIndex === index ? 5 : 3}
                fill="hsl(var(--primary))"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            ))}
          </svg>

          {activePoint && (
            <div
              className="pointer-events-none absolute top-2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs shadow-soft backdrop-blur-sm"
              style={{
                left: `${(activePoint.x / chart.width) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <p className="font-medium text-foreground">{activePoint.label}</p>
              <p className="text-muted-foreground">
                {coinsFormatter.format(activePoint.balance)} Coins
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex justify-between text-xs text-muted-foreground">
          <span>{data[0]?.date}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  );
}
