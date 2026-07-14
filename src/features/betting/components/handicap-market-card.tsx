"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { MatchWithMarkets } from "@/features/betting/types";
import { trackAddToSlip } from "@/lib/analytics/gtm";
import { cn } from "@/lib/utils";
import { useBetSlipStore } from "@/store/bet-slip-store";

type Market = MatchWithMarkets["markets"][number];
type Odd = Market["odds"][number];

interface HandicapMarketCardProps {
  match: Pick<MatchWithMarkets, "id" | "homeTeam" | "awayTeam">;
  groupLabel: string;
  markets: Market[];
}

interface HandicapLine {
  line: number;
  market: Market;
  odds: Odd[];
}

function formatLine(line: number): string {
  if (line > 0) return `+${line}`;
  return String(line);
}

function parseLineFromMarket(market: Market): number | null {
  const fromLabel =
    /(?:Handicap(?: asiático)?(?: de escanteios| de cartões)?(?: - 1º tempo)?)\s*-\s*([+-]?[\d.]+)$/i.exec(
      market.label
    ) ?? / ([+-]?[\d.]+)$/.exec(market.label);
  if (fromLabel) return Number(fromLabel[1]);

  const fromType = /_([+-]?[\d.]+)$/.exec(market.type);
  if (fromType) return Number(fromType[1]);
  return null;
}

function toHomeLine(parsedLine: number, market: Market): number {
  const hasHome = market.odds.some((odd) => odd.selection.startsWith("HOME"));
  const hasAway = market.odds.some((odd) => odd.selection.startsWith("AWAY"));
  // Dado legado: API gravava cada ponta como mercado separado (só casa ou só fora).
  if (!hasHome && hasAway) return -parsedLine;
  return parsedLine;
}

function mergeOdds(a: Odd[], b: Odd[]): Odd[] {
  const byKey = new Map<string, Odd>();
  for (const odd of [...a, ...b]) {
    const key = odd.selection.startsWith("HOME")
      ? "HOME"
      : odd.selection.startsWith("AWAY")
        ? "AWAY"
        : odd.id;
    if (!byKey.has(key)) byKey.set(key, odd);
  }
  return [...byKey.values()];
}

function dedupeByLine(markets: Market[]): HandicapLine[] {
  const byLine = new Map<number, HandicapLine>();

  for (const market of markets) {
    const parsed = parseLineFromMarket(market);
    if (parsed === null || Number.isNaN(parsed)) continue;
    const line = toHomeLine(parsed, market);
    const existing = byLine.get(line);
    if (!existing) {
      byLine.set(line, { line, market, odds: [...market.odds] });
      continue;
    }
    const odds = mergeOdds(existing.odds, market.odds);
    byLine.set(line, {
      line,
      // Mantém o mercado "principal" com mais opções (ou o já escolhido).
      market: market.odds.length > existing.market.odds.length ? market : existing.market,
      odds,
    });
  }

  return [...byLine.values()].sort((a, b) => a.line - b.line);
}

function defaultIndex(lines: HandicapLine[]): number {
  if (lines.length === 0) return 0;
  let best = 0;
  let bestAbs = Math.abs(lines[0].line);
  for (let i = 1; i < lines.length; i++) {
    const abs = Math.abs(lines[i].line);
    if (abs < bestAbs) {
      best = i;
      bestAbs = abs;
    }
  }
  return best;
}

/**
 * Handicap com seletor de linha (setas + slider): uma linha por vez,
 * sem listar dezenas de cards duplicados.
 */
export function HandicapMarketCard({ match, groupLabel, markets }: HandicapMarketCardProps) {
  const lines = useMemo(() => dedupeByLine(markets), [markets]);
  const [index, setIndex] = useState(() => defaultIndex(lines));

  const selections = useBetSlipStore((state) => state.selections);
  const toggleSelection = useBetSlipStore((state) => state.toggleSelection);
  const matchLabel = `${match.homeTeam} x ${match.awayTeam}`;

  if (lines.length === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), lines.length - 1);
  const current = lines[safeIndex];
  const progress = lines.length <= 1 ? 50 : (safeIndex / (lines.length - 1)) * 100;

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), lines.length - 1));
  }

  return (
    <Card className="border-border/80 sm:col-span-2">
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">{groupLabel}</p>

        <div className="flex items-stretch gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label="Linha anterior"
            disabled={safeIndex <= 0}
            onClick={() => goTo(safeIndex - 1)}
            className="flex h-auto w-8 shrink-0 items-center justify-center self-stretch rounded-xl border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            {current.odds.map((odd) => {
              const isSelected = selections.some((selection) => selection.oddId === odd.id);
              return (
                <button
                  key={odd.id}
                  type="button"
                  onClick={() => {
                    const alreadySelected = isSelected;
                    toggleSelection({
                      oddId: odd.id,
                      matchId: match.id,
                      marketId: current.market.id,
                      matchLabel,
                      marketLabel: current.market.label,
                      selectionLabel: odd.label,
                      oddValue: odd.value,
                    });
                    if (!alreadySelected) {
                      trackAddToSlip({
                        matchId: match.id,
                        marketType: current.market.type,
                        oddValue: odd.value,
                      });
                    }
                  }}
                  className={cn(
                    "flex min-h-[3.25rem] items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent",
                    isSelected && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 truncate text-xs font-medium text-foreground",
                      isSelected && "text-primary-foreground"
                    )}
                  >
                    {odd.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums text-primary",
                      isSelected && "text-primary-foreground"
                    )}
                  >
                    {odd.value.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-label="Próxima linha"
            disabled={safeIndex >= lines.length - 1}
            onClick={() => goTo(safeIndex + 1)}
            className="flex h-auto w-8 shrink-0 items-center justify-center self-stretch rounded-xl border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {lines.length > 1 && (
          <div className="flex flex-col items-center gap-2 px-1 pt-1">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {formatLine(current.line)}
            </span>
            <input
              type="range"
              min={0}
              max={lines.length - 1}
              step={1}
              value={safeIndex}
              aria-label={`Linha de ${groupLabel}`}
              onChange={(event) => goTo(Number(event.target.value))}
              className="handicap-slider w-full"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%, hsl(var(--muted)) 100%)`,
              }}
            />
            <div className="flex w-full justify-between text-[10px] text-muted-foreground">
              <span>{formatLine(lines[0].line)}</span>
              <span>{formatLine(lines[lines.length - 1].line)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
