"use client";

import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { OddButton } from "@/features/betting/components/odd-button";
import type { MatchWithMarkets } from "@/features/betting/types";
import { trackAddToSlip } from "@/lib/analytics/gtm";
import { useBetSlipStore } from "@/store/bet-slip-store";

type Market = MatchWithMarkets["markets"][number];
type Odd = Market["odds"][number];

interface HandicapMarketCardProps {
  match: Pick<MatchWithMarkets, "id" | "homeTeam" | "awayTeam">;
  groupLabel: string;
  markets: Market[];
}

interface HandicapLine {
  /** Handicap do mandante nesta linha (ex.: -1.5). Visitante = oposto. */
  homeLine: number;
  market: Market;
  homeOdd: Odd;
  awayOdd: Odd;
}

function formatLine(line: number): string {
  if (line > 0) return `+${line}`;
  return String(line);
}

function parseOddPoint(odd: Odd): { side: "HOME" | "AWAY"; point: number } | null {
  const match = /^(HOME|AWAY)_([+-]?[\d.]+)$/.exec(odd.selection);
  if (!match) return null;
  const point = Number(match[2]);
  if (!Number.isFinite(point)) return null;
  return { side: match[1] as "HOME" | "AWAY", point };
}

/**
 * Cada degrau do slider = uma linha completa:
 *   França -1.5  |  Espanha +1.5
 *   França +2.5  |  Espanha -2.5
 * (ambos os times, handicap complementar do mandante).
 */
function buildCompleteLines(markets: Market[]): HandicapLine[] {
  type Bucket = { market: Market; homeOdd?: Odd; awayOdd?: Odd };
  const byHomeLine = new Map<number, Bucket>();

  for (const market of markets) {
    for (const odd of market.odds) {
      const parsed = parseOddPoint(odd);
      if (!parsed) continue;

      // Canonical: handicap do mandante. Fora com +1.5 ⇒ casa com -1.5.
      const homeLine = parsed.side === "HOME" ? parsed.point : -parsed.point;
      const bucket = byHomeLine.get(homeLine) ?? { market };

      if (parsed.side === "HOME") {
        if (!bucket.homeOdd) bucket.homeOdd = odd;
      } else if (!bucket.awayOdd) {
        bucket.awayOdd = odd;
      }

      // Prefere o market que já trouxe as duas pontas.
      if (market.odds.length >= (bucket.market.odds.length ?? 0)) {
        bucket.market = market;
      }

      byHomeLine.set(homeLine, bucket);
    }
  }

  return [...byHomeLine.entries()]
    .filter(([, bucket]) => bucket.homeOdd && bucket.awayOdd)
    .map(([homeLine, bucket]) => ({
      homeLine,
      market: bucket.market,
      homeOdd: bucket.homeOdd!,
      awayOdd: bucket.awayOdd!,
    }))
    .sort((a, b) => a.homeLine - b.homeLine);
}

function defaultIndex(lines: HandicapLine[]): number {
  if (lines.length === 0) return 0;
  let best = 0;
  let bestAbs = Math.abs(lines[0].homeLine);
  for (let i = 1; i < lines.length; i++) {
    const abs = Math.abs(lines[i].homeLine);
    if (abs < bestAbs) {
      best = i;
      bestAbs = abs;
    }
  }
  return best;
}

export function HandicapMarketCard({ match, groupLabel, markets }: HandicapMarketCardProps) {
  const lines = useMemo(() => buildCompleteLines(markets), [markets]);
  const [index, setIndex] = useState(() => defaultIndex(lines));

  const selections = useBetSlipStore((state) => state.selections);
  const toggleSelection = useBetSlipStore((state) => state.toggleSelection);
  const matchLabel = `${match.homeTeam} x ${match.awayTeam}`;

  if (lines.length === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), lines.length - 1);
  const current = lines[safeIndex];
  const progress = lines.length <= 1 ? 0 : (safeIndex / (lines.length - 1)) * 100;

  const homeLabel = `${match.homeTeam} ${formatLine(current.homeLine)}`;
  const awayLabel = `${match.awayTeam} ${formatLine(-current.homeLine)}`;

  const buttons = [
    { odd: current.homeOdd, displayLabel: homeLabel },
    { odd: current.awayOdd, displayLabel: awayLabel },
  ];

  return (
    <Card className="border-border/80 sm:col-span-2">
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">{groupLabel}</p>

        <div className="flex gap-2">
          {buttons.map(({ odd, displayLabel }) => {
            const isSelected = selections.some((selection) => selection.oddId === odd.id);
            return (
              <OddButton
                key={odd.id}
                label={displayLabel}
                value={odd.value}
                isSelected={isSelected}
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
              />
            );
          })}
        </div>

        {lines.length > 1 && (
          <div className="relative px-1 pt-7">
            <span
              className="pointer-events-none absolute top-0 -translate-x-1/2 text-sm font-semibold tabular-nums text-foreground"
              style={{ left: `clamp(1.25rem, ${progress}%, calc(100% - 1.25rem))` }}
            >
              {formatLine(current.homeLine)}
            </span>
            <input
              type="range"
              min={0}
              max={lines.length - 1}
              step={1}
              value={safeIndex}
              aria-label={`Linha de ${groupLabel}`}
              aria-valuetext={formatLine(current.homeLine)}
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
