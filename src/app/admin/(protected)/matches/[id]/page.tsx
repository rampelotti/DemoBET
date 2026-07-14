import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMatchWithDetails } from "@/features/admin/data/get-all-matches";
import { SettleMatchForm } from "@/features/admin/components/settle-match-form";

export const metadata: Metadata = {
  title: "Admin · Gerenciar partida",
};

interface AdminMatchDetailPageProps {
  params: Promise<{ id: string }>;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminMatchDetailPage({ params }: AdminMatchDetailPageProps) {
  const { id } = await params;
  const match = await getMatchWithDetails(id);

  if (!match) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{match.league}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {match.homeTeam} <span className="text-muted-foreground">x</span> {match.awayTeam}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {dateFormatter.format(new Date(match.startTime))}
        </p>
      </div>

      {match.status === "FINISHED" ? (
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground">Resultado final</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {match.homeScore} - {match.awayScore}
          </p>
        </div>
      ) : (
        <SettleMatchForm matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Mercados e odds</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {match.markets.map((market) => (
            <div key={market.id} className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-foreground">{market.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {market.odds.map((odd) => (
                  <span
                    key={odd.id}
                    className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {odd.label}: <span className="font-semibold text-foreground">{odd.value.toFixed(2)}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Seleções apostadas ({match.betSelections.length})
        </h2>
        {match.betSelections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma aposta feita nesta partida ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-background">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Seleção</th>
                  <th className="px-4 py-3 font-medium">Odd</th>
                  <th className="px-4 py-3 font-medium">Coins</th>
                  <th className="px-4 py-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {match.betSelections.map((selection) => (
                  <tr key={selection.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{selection.selectionLabel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{selection.oddValue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{selection.bet.stake}</td>
                    <td className="px-4 py-3 text-muted-foreground">{selection.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
