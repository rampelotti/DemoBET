import {
  BarChart3,
  Hash,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { StatCard } from "@/features/dashboard/components/stat-card";
import type { PerformanceSummary } from "@/features/performance/types";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const unitsFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const oddFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

interface PerformanceSummaryCardsProps {
  summary: PerformanceSummary;
}

export function PerformanceSummaryCards({ summary }: PerformanceSummaryCardsProps) {
  const profitPositive = summary.profitUnits >= 0;
  const roiPositive = summary.roi >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        label="ROI"
        value={`${percentFormatter.format(summary.roi)}%`}
        icon={roiPositive ? TrendingUp : TrendingDown}
        helperText="Retorno sobre o volume apostado"
      />
      <StatCard
        label="Lucro / Prejuízo"
        value={`${unitsFormatter.format(summary.profitUnits)} u.`}
        icon={profitPositive ? TrendingUp : TrendingDown}
        helperText="Em unidades (1 u. = stake padrão)"
      />
      <StatCard
        label="Assertividade"
        value={`${percentFormatter.format(summary.winRate)}%`}
        icon={Target}
        helperText="Apostas vencedoras no período"
      />
      <StatCard
        label="Total de apostas"
        value={String(summary.totalBets)}
        icon={Hash}
        helperText="Apostas resolvidas consideradas"
      />
      <StatCard
        label="Odd média"
        value={oddFormatter.format(summary.avgOdd)}
        icon={BarChart3}
        helperText="Média das odds das seleções"
      />
    </div>
  );
}
