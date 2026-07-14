"use client";

import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { OddButton } from "@/features/betting/components/odd-button";
import type { MatchWithMarkets } from "@/features/betting/types";
import { trackAddToSlip } from "@/lib/analytics/gtm";
import { useBetSlipStore } from "@/store/bet-slip-store";

type Market = MatchWithMarkets["markets"][number];
type Odd = Market["odds"][number];

interface MarketLinesSliderProps {
  match: Pick<MatchWithMarkets, "id" | "homeTeam" | "awayTeam">;
  groupLabel: string;
  markets: Market[];
  /** Handicap (casa/fora) ou over/under (mais/menos). */
  mode: "handicap" | "overUnder";
}

interface SliderLine {
  line: number;
  market: Market;
  left: { odd: Odd; label: string };
  right: { odd: Odd; label: string };
}

function formatHandicap(line: number): string {
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

function buildHandicapLines(
  markets: Market[],
  homeTeam: string,
  awayTeam: string
): SliderLine[] {
  type Bucket = { market: Market; home?: Odd; away?: Odd };
  const byHomeLine = new Map<number, Bucket>();

  for (const market of markets) {
    for (const odd of market.odds) {
      const parsed = parseOddPoint(odd);
      if (!parsed) continue;
      const homeLine = parsed.side === "HOME" ? parsed.point : -parsed.point;
      const bucket = byHomeLine.get(homeLine) ?? { market };

      // Só aceita odd cujo ponto bate com a linha canônica.
      if (parsed.side === "HOME" && Math.abs(parsed.point - homeLine) < 1e-9) {
        bucket.home = odd;
      }
      if (parsed.side === "AWAY" && Math.abs(parsed.point + homeLine) < 1e-9) {
        bucket.away = odd;
      }
      if (market.odds.length >= bucket.market.odds.length) bucket.market = market;
      byHomeLine.set(homeLine, bucket);
    }
  }

  return [...byHomeLine.entries()]
    .filter(([, bucket]) => bucket.home && bucket.away)
    .map(([homeLine, bucket]) => ({
      line: homeLine,
      market: bucket.market,
      left: {
        odd: bucket.home!,
        label: `${homeTeam} ${formatHandicap(homeLine)}`,
      },
      right: {
        odd: bucket.away!,
        label: `${awayTeam} ${formatHandicap(-homeLine)}`,
      },
    }))
    .sort((a, b) => a.line - b.line);
}

function buildOverUnderLines(markets: Market[]): SliderLine[] {
  const lines: SliderLine[] = [];

  for (const market of markets) {
    const over = market.odds.find((odd) => odd.selection === "OVER" || odd.selection.startsWith("OVER_"));
    const under = market.odds.find((odd) => odd.selection === "UNDER" || odd.selection.startsWith("UNDER_"));
    if (!over || !under) continue;

    const fromLabel = /Mais\/Menos de ([\d.]+)$/.exec(market.label);
    const fromType = /_([\d.]+)$/.exec(market.type);
    const line = Number(fromLabel?.[1] ?? fromType?.[1]);
    if (!Number.isFinite(line)) continue;

    lines.push({
      line,
      market,
      left: { odd: over, label: `Mais de ${line}` },
      right: { odd: under, label: `Menos de ${line}` },
    });
  }

  return lines.sort((a, b) => a.line - b.line);
}

function defaultIndex(lines: SliderLine[]): number {
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
 * Um bloco com slider para mercados de muitas linhas (handicap, escanteios,
 * cartões, totais…). Sempre mostra as duas pontas da linha atual.
 */
export function MarketLinesSlider({ match, groupLabel, markets, mode }: MarketLinesSliderProps) {
  const lines = useMemo(
    () =>
      mode === "handicap"
        ? buildHandicapLines(markets, match.homeTeam, match.awayTeam)
        : buildOverUnderLines(markets),
    [markets, match.homeTeam, match.awayTeam, mode]
  );
  const [index, setIndex] = useState(() => defaultIndex(lines));

  const selections = useBetSlipStore((state) => state.selections);
  const toggleSelection = useBetSlipStore((state) => state.toggleSelection);
  const matchLabel = `${match.homeTeam} x ${match.awayTeam}`;

  if (lines.length === 0) return null;

  const safeIndex = Math.min(Math.max(index, 0), lines.length - 1);
  const current = lines[safeIndex];
  const progress = lines.length <= 1 ? 0 : (safeIndex / (lines.length - 1)) * 100;
  const lineLabel =
    mode === "handicap" ? formatHandicap(current.line) : String(current.line);

  const buttons = [current.left, current.right];

  return (
    <Card className="border-border/80 sm:col-span-2">
      <CardContent className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">{groupLabel}</p>

        <div className="flex gap-2">
          {buttons.map(({ odd, label }) => {
            const isSelected = selections.some((selection) => selection.oddId === odd.id);
            return (
              <OddButton
                key={odd.id}
                label={label}
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
                    selectionLabel: label,
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
              {lineLabel}
            </span>
            <input
              type="range"
              min={0}
              max={lines.length - 1}
              step={1}
              value={safeIndex}
              aria-label={`Linha de ${groupLabel}`}
              aria-valuetext={lineLabel}
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
