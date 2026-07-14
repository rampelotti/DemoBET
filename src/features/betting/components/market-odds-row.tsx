"use client";

import { OddButton } from "@/features/betting/components/odd-button";
import type { MatchWithMarkets } from "@/features/betting/types";
import { useBetSlipStore } from "@/store/bet-slip-store";

interface MarketOddsRowProps {
  match: Pick<MatchWithMarkets, "id" | "homeTeam" | "awayTeam">;
  market: MatchWithMarkets["markets"][number];
  /**
   * Quando várias linhas do mesmo mercado (ex.: "Mais/Menos de 6.5", "7.5",
   * "8.5") são agrupadas em um único card (ver `GroupedMarketCard`), o
   * título do grupo já aparece uma vez no topo — por isso cada linha
   * individual não repete o próprio label aqui.
   */
  showLabel?: boolean;
}

export function MarketOddsRow({ match, market, showLabel = true }: MarketOddsRowProps) {
  const selections = useBetSlipStore((state) => state.selections);
  const toggleSelection = useBetSlipStore((state) => state.toggleSelection);
  const matchLabel = `${match.homeTeam} x ${match.awayTeam}`;

  return (
    <div className="flex flex-col gap-1.5">
      {showLabel && <p className="text-xs text-muted-foreground">{market.label}</p>}
      <div className="flex flex-wrap gap-2">
        {market.odds.map((odd) => (
          <OddButton
            key={odd.id}
            label={odd.label}
            value={odd.value}
            isSelected={selections.some((selection) => selection.oddId === odd.id)}
            onClick={() =>
              toggleSelection({
                oddId: odd.id,
                matchId: match.id,
                marketId: market.id,
                matchLabel,
                marketLabel: market.label,
                selectionLabel: odd.label,
                oddValue: odd.value,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}
