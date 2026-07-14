"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { MarketOddsRow } from "@/features/betting/components/market-odds-row";
import type { MatchWithMarkets } from "@/features/betting/types";

/** Acima dessa quantidade de linhas, o bloco nasce recolhido (mostra só as primeiras) até o usuário expandir. */
export const COLLAPSE_THRESHOLD = 4;

interface GroupedMarketCardProps {
  match: Pick<MatchWithMarkets, "id" | "homeTeam" | "awayTeam">;
  groupLabel: string;
  markets: MatchWithMarkets["markets"];
  expanded: boolean;
  onToggleExpanded: () => void;
}

/**
 * Junta várias linhas do mesmo mercado (ex.: "Total de escanteios - Mais/Menos
 * de 6.5", "7.5", "8.5") em um único card, uma linha embaixo da outra, em
 * ordem crescente — como nas casas de aposta reais — em vez de espalhar cada
 * linha em cards separados. Quando há muitas linhas, nasce recolhido com um
 * botão "Ver todas" (controlável também pelo "Expandir tudo" da página).
 */
export function GroupedMarketCard({
  match,
  groupLabel,
  markets,
  expanded,
  onToggleExpanded,
}: GroupedMarketCardProps) {
  const isCollapsible = markets.length > COLLAPSE_THRESHOLD;
  const visibleMarkets = isCollapsible && !expanded ? markets.slice(0, COLLAPSE_THRESHOLD) : markets;

  return (
    <Card className="border-border/80 sm:col-span-2">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{groupLabel}</p>
          {isCollapsible && (
            <button
              type="button"
              onClick={onToggleExpanded}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {expanded ? (
                <>
                  Ver menos
                  <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Ver todas ({markets.length})
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2 divide-y divide-border/60">
          {visibleMarkets.map((market) => (
            <div key={market.id} className="pt-2 first:pt-0">
              <MarketOddsRow match={match} market={market} showLabel={false} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
