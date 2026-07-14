import Link from "next/link";
import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { BankrollChart } from "@/features/performance/components/bankroll-chart";
import { PerformanceBreakdownTable } from "@/features/performance/components/performance-breakdown-table";
import { PerformanceInsights } from "@/features/performance/components/performance-insights";
import { PerformanceSummaryCards } from "@/features/performance/components/performance-summary-cards";
import type { PerformanceData } from "@/features/performance/types";

interface PerformanceDashboardProps {
  data: PerformanceData;
}

export function PerformanceDashboard({ data }: PerformanceDashboardProps) {
  const hasHistory = data.summary.totalBets > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meu Desempenho</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe sua evolução nas apostas simuladas e identifique onde você performa melhor.
        </p>
      </div>

      <PerformanceSummaryCards summary={data.summary} />

      {!hasHistory ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma aposta resolvida ainda"
          description="Assim que suas apostas forem liquidadas, o ROI, a curva da banca e os insights aparecem aqui — só com os seus dados."
          action={
            <Button asChild>
              <Link href="/">Ver partidas</Link>
            </Button>
          }
        />
      ) : (
        <>
          <BankrollChart data={data.bankroll} />
          <PerformanceInsights insights={data.insights} />

          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Análise detalhada</h2>
              <p className="text-sm text-muted-foreground">
                Breakdown por mercado, competição, time, linha e faixa de odds.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <PerformanceBreakdownTable
                title="Por mercado"
                description="Escanteios, Over, Under, BTTS, Handicap e outros"
                labelHeader="Mercado"
                rows={data.byMarket}
              />
              <PerformanceBreakdownTable
                title="Por campeonato"
                description="Desempenho em cada competição"
                labelHeader="Campeonato"
                rows={data.byLeague}
              />
              <PerformanceBreakdownTable
                title="Por time"
                description="Times em que você mais apostou"
                labelHeader="Time"
                rows={data.byTeam}
              />
              <PerformanceBreakdownTable
                title="Por linha"
                description="Ex.: Over 7.5, 8.5 e 9.5 escanteios"
                labelHeader="Linha"
                rows={data.byLine}
              />
              <PerformanceBreakdownTable
                title="Por faixa de odds"
                description="Rentabilidade conforme a odd média da aposta"
                labelHeader="Faixa"
                rows={data.byOddsRange}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
