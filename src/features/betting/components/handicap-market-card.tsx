"use client";

import { useMemo, useState } from "react";

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
  homeOdd?: Odd;
  awayOdd?: Odd;
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
  if (!hasHome && hasAway) return -parsedLine;
  return parsedLine;
}

function pickSide(odds: Odd[], side: "HOME" | "AWAY"): Odd | undefined {
  return odds.find((odd) => odd.selection.startsWith(side));
}

function dedupeByLine(markets: Market[]): HandicapLine[] {
  const byLine = new Map<number, { market: Market; odds: Odd[] }>();

  for (const market of markets) {
    const parsed = parseLineFromMarket(market);
    if (parsed === null || Number.isNaN(parsed)) continue;
    const line = toHomeLine(parsed, market);
    const existing = byLine.get(line);
    if (!existing) {
      byLine.set(line, { market, odds: [...market.odds] });
      continue;
    }
    const merged = [...existing.odds];
    for (const odd of market.odds) {
      const side = odd.selection.startsWith("HOME")
        ? "HOME"
        : odd.selection.startsWith("AWAY")
          ? "AWAY"
          : null;
      if (!side) {
        merged.push(odd);
        continue;
      }
      if (!merged.some((item) => item.selection.startsWith(side))) {
        merged.push(odd);
      }
    }
    byLine.set(line, {
      market: market.odds.length > existing.market.odds.length ? market : existing.market,
      odds: merged,
    });
  }

  return [...byLine.entries()]
    .map(([line, entry]) => ({
      line,
      market: entry.market,
      homeOdd: pickSide(entry.odds, "HOME"),
      awayOdd: pickSide(entry.odds, "AWAY"),
    }))
    .filter((entry) => entry.homeOdd || entry.awayOdd)
    .sort((a, b) => a.line - b.line);
}

/** Linha mais próxima de zero (favorito leve, como −0.25 no anexo). */
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
 * Handicap estilo casa de aposta: dois botões (casa/fora) + slider de linha.
 * Sem setas laterais — no mobile o espaço vai todo para o texto legível.
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
  const progress = lines.length <= 1 ? 0 : (safeIndex / (lines.length - 1)) * 100;

  const homeLabel = `${match.homeTeam} ${formatLine(current.line)}`;
  const awayLabel = `${match.awayTeam} ${formatLine(-current.line)}`;

  const buttons = [
    current.homeOdd
      ? { odd: current.homeOdd, displayLabel: homeLabel }
      : null,
    current.awayOdd
      ? { odd: current.awayOdd, displayLabel: awayLabel }
      : null,
  ].filter(Boolean) as { odd: Odd; displayLabel: string }[];

  return (
    <Card className="border-border/80 sm:col-span-2">
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">{groupLabel}</p>

        <div className="grid grid-cols-2 gap-2">
          {buttons.map(({ odd, displayLabel }) => {
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
                    selectionLabel: displayLabel,
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
                  "flex min-h-[3.5rem] items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent",
                  isSelected && "border-primary bg-primary text-primary-foreground hover:bg-primary"
                )}
              >
                <span
                  className={cn(
                    "min-w-0 text-[13px] font-medium leading-snug text-foreground",
                    isSelected && "text-primary-foreground"
                  )}
                >
                  {displayLabel}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-base font-semibold tabular-nums text-primary",
                    isSelected && "text-primary-foreground"
                  )}
                >
                  {odd.value.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>

        {lines.length > 1 && (
          <div className="relative px-1 pt-7">
            <span
              className="pointer-events-none absolute top-0 -translate-x-1/2 text-sm font-semibold tabular-nums text-foreground"
              style={{ left: `clamp(1.25rem, ${progress}%, calc(100% - 1.25rem))` }}
            >
              {formatLine(current.line)}
            </span>
            <input
              type="range"
              min={0}
              max={lines.length - 1}
              step={1}
              value={safeIndex}
              aria-label={`Linha de ${groupLabel}`}
              aria-valuetext={formatLine(current.line)}
              onChange={(event) => setIndex(Number(event.target.value))}
              className="handicap-slider w-full"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%, hsl(var(--muted)) 100%)`,
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
