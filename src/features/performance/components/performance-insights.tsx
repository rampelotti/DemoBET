import {
  Award,
  BarChart2,
  LineChart,
  Shield,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceInsights } from "@/features/performance/types";
import { cn } from "@/lib/utils";

interface PerformanceInsightsProps {
  insights: PerformanceInsights;
}

const insightItems: {
  key: keyof PerformanceInsights;
  label: string;
  icon: typeof TrendingUp;
  tone: "positive" | "negative" | "neutral";
}[] = [
  { key: "bestMarket", label: "Melhor mercado", icon: TrendingUp, tone: "positive" },
  { key: "worstMarket", label: "Pior mercado", icon: TrendingDown, tone: "negative" },
  { key: "bestLeague", label: "Melhor campeonato", icon: Trophy, tone: "positive" },
  { key: "bestTeam", label: "Melhor time", icon: Shield, tone: "positive" },
  { key: "bestLine", label: "Linha mais lucrativa", icon: LineChart, tone: "positive" },
  { key: "bestOddsRange", label: "Faixa de odds mais lucrativa", icon: BarChart2, tone: "positive" },
];

const toneStyles = {
  positive: "border-emerald-200/80 bg-emerald-50/60",
  negative: "border-primary/20 bg-primary/5",
  neutral: "border-border bg-card",
};

const iconToneStyles = {
  positive: "bg-emerald-100 text-emerald-700",
  negative: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

export function PerformanceInsights({ insights }: PerformanceInsightsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Award className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <div>
            <CardTitle>Insights</CardTitle>
            <CardDescription>
              Destaques automáticos com base no seu histórico de apostas simuladas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {insightItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                  toneStyles[item.tone]
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    iconToneStyles[item.tone]
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{insights[item.key]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
