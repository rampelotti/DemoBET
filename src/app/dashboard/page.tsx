import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Coins,
  Flame,
  History,
  ListChecks,
  Percent,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { getDashboardStats } from "@/features/dashboard/data/get-dashboard-stats";

export const metadata: Metadata = {
  title: "Meu perfil",
};

const coinsFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const stats = await getDashboardStats(currentUser.id);

  const streakLabel =
    stats.streak.type === "NONE"
      ? "Sem apostas resolvidas"
      : `${stats.streak.count} ${stats.streak.type === "WON" ? "vitória(s)" : "derrota(s)"} seguida(s)`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Olá, {currentUser.displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seu desempenho no modo simulação com Coins.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0 gap-2">
          <Link href="/dashboard/desempenho">
            <BarChart3 className="h-4 w-4" />
            Meu Desempenho
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Saldo de Coins"
          value={`${coinsFormatter.format(stats.balance)}`}
          icon={Coins}
          helperText="Disponível para apostar"
        />
        <StatCard
          label="ROI"
          value={`${percentFormatter.format(stats.roi)}%`}
          icon={stats.roi >= 0 ? TrendingUp : TrendingDown}
          helperText="Sobre o total apostado (resolvidas)"
        />
        <StatCard
          label="Lucro"
          value={`${stats.profit >= 0 ? "+" : ""}${coinsFormatter.format(stats.profit)} Coins`}
          icon={stats.profit >= 0 ? TrendingUp : TrendingDown}
          helperText="Retorno menos valor apostado"
        />
        <StatCard
          label="Taxa de acerto"
          value={`${percentFormatter.format(stats.winrate)}%`}
          icon={Percent}
          helperText={`${stats.wonBets} vitórias de ${stats.wonBets + stats.lostBets} resolvidas`}
        />
        <StatCard
          label="Apostas"
          value={`${stats.totalBets}`}
          icon={ListChecks}
          helperText={`${stats.openBets} em aberto`}
        />
        <StatCard
          label="Odd média"
          value={stats.avgOdd > 0 ? stats.avgOdd.toFixed(2) : "—"}
          icon={Target}
          helperText="Média das odds apostadas"
        />
      </div>

      <div className="rounded-2xl border border-border bg-background p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Flame className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Sequência atual</p>
            <p className="text-sm text-muted-foreground">{streakLabel}</p>
          </div>
        </div>
      </div>

      {stats.totalBets === 0 ? (
        <EmptyState
          icon={History}
          title="Você ainda não fez nenhuma aposta"
          description="Volte para a página inicial, escolha uma odd e monte seu primeiro cupom com Coins."
          action={
            <Button asChild size="lg" className="mt-2">
              <Link href="/">Ver partidas</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
          <p className="text-sm text-muted-foreground">
            Quer ver o detalhe de cada aposta feita?
          </p>
          <Button asChild variant="outline">
            <Link href="/meus-palpites">Ver meus palpites</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
