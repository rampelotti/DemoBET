"use client";

import { useState } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { COLLAPSE_THRESHOLD, GroupedMarketCard } from "@/features/betting/components/grouped-market-card";
import { MarketOddsRow } from "@/features/betting/components/market-odds-row";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  categorizeMarketType,
  type MarketCategory,
} from "@/features/betting/lib/market-categories";
import type { MatchWithMarkets } from "@/features/betting/types";
import { cn } from "@/lib/utils";

interface MatchMarketsTabsProps {
  match: MatchWithMarkets;
}

type Market = MatchWithMarkets["markets"][number];

type RenderItem =
  | { kind: "single"; key: string; market: Market }
  | { kind: "group"; key: string; groupLabel: string; markets: Market[] };

/**
 * Mercados de linha (over/under): "<algo> - Mais/Menos de <linha>".
 * Handicaps: "<família> - <linha>" (ex.: "Handicap - -0.5").
 * Fallback por `type` cobre odds já gravadas com rótulo antigo.
 */
const LINE_LABEL_PATTERN = /^(.*) - Mais\/Menos de ([\d.]+)$/;
const HANDICAP_LABEL_PATTERN =
  /^(Handicap(?: de escanteios| de cartões)?(?: - 1º tempo)?|Handicap asiático) - ([+-]?[\d.]+)$/;
const LEGACY_HANDICAP_LABEL_PATTERN =
  /^(Handicap(?: asiático)?) ([+-]?[\d.]+)$/;
const SPREAD_TYPE_PATTERN =
  /^(?:ALTERNATE_)?SPREADS(_H1|_CORNERS|_CARDS)?_([+-]?[\d.]+)$/;

function groupLabelForSpreadSuffix(suffix: string | undefined): string {
  switch (suffix) {
    case "_H1":
      return "Handicap - 1º tempo";
    case "_CORNERS":
      return "Handicap de escanteios";
    case "_CARDS":
      return "Handicap de cartões";
    default:
      return "Handicap";
  }
}

function parseGroupableMarket(market: Market): { groupLabel: string; line: number } | null {
  const lineMatch = LINE_LABEL_PATTERN.exec(market.label);
  if (lineMatch) {
    return { groupLabel: lineMatch[1], line: Number(lineMatch[2]) };
  }

  const handicapMatch = HANDICAP_LABEL_PATTERN.exec(market.label);
  if (handicapMatch) {
    return { groupLabel: handicapMatch[1], line: Number(handicapMatch[2]) };
  }

  const legacyHandicap = LEGACY_HANDICAP_LABEL_PATTERN.exec(market.label);
  if (legacyHandicap) {
    return { groupLabel: legacyHandicap[1], line: Number(legacyHandicap[2]) };
  }

  const spreadType = SPREAD_TYPE_PATTERN.exec(market.type);
  if (spreadType) {
    return {
      groupLabel: groupLabelForSpreadSuffix(spreadType[1]),
      line: Number(spreadType[2]),
    };
  }

  return null;
}

function buildRenderItems(markets: Market[]): RenderItem[] {
  const groupOrder: string[] = [];
  const groupsByLabel = new Map<string, { line: number; market: Market }[]>();
  const singles: RenderItem[] = [];

  for (const market of markets) {
    const parsed = parseGroupableMarket(market);
    if (!parsed) {
      singles.push({ kind: "single", key: market.id, market });
      continue;
    }

    const { groupLabel, line } = parsed;
    if (!groupsByLabel.has(groupLabel)) {
      groupOrder.push(groupLabel);
      groupsByLabel.set(groupLabel, []);
    }
    groupsByLabel.get(groupLabel)?.push({ line, market });
  }

  const groupItems: RenderItem[] = groupOrder.map((groupLabel) => {
    const entries = [...(groupsByLabel.get(groupLabel) ?? [])].sort((a, b) => a.line - b.line);
    return {
      kind: "group",
      key: `group:${groupLabel}`,
      groupLabel,
      markets: entries.map((entry) => entry.market),
    };
  });

  return [...groupItems, ...singles];
}

export function MatchMarketsTabs({ match }: MatchMarketsTabsProps) {
  const groups = new Map<MarketCategory, Market[]>();
  for (const market of match.markets) {
    const category = categorizeMarketType(market.type);
    groups.set(category, [...(groups.get(category) ?? []), market]);
  }

  const availableCategories = CATEGORY_ORDER.filter((category) => groups.has(category));
  const [active, setActive] = useState<MarketCategory>(availableCategories[0] ?? "principais");
  // Estado de expandido/recolhido por grupo (chave = groupLabel), controlado
  // tanto pelo botão "Expandir tudo" quanto pelo botão individual de cada
  // bloco — igual ao padrão usado pelas casas de apostas.
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  if (availableCategories.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum mercado disponível para essa partida.</p>;
  }

  const activeMarkets = groups.get(active) ?? [];
  const renderItems = buildRenderItems(activeMarkets);

  const collapsibleKeys = renderItems
    .filter((item) => item.kind === "group" && item.markets.length > COLLAPSE_THRESHOLD)
    .map((item) => item.key);
  const allExpanded =
    collapsibleKeys.length > 0 && collapsibleKeys.every((key) => expandedGroups[key]);

  function toggleExpandAll() {
    const nextValue = !allExpanded;
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const key of collapsibleKeys) next[key] = nextValue;
      return next;
    });
  }

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                active === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {CATEGORY_LABELS[category]}
              <span className="ml-1.5 opacity-70">({groups.get(category)?.length})</span>
            </button>
          ))}
        </div>

        {collapsibleKeys.length > 0 && (
          <button
            type="button"
            onClick={toggleExpandAll}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp className="h-3.5 w-3.5" />
                Recolher tudo
              </>
            ) : (
              <>
                <ChevronsUpDown className="h-3.5 w-3.5" />
                Expandir tudo
              </>
            )}
          </button>
        )}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2">
        {renderItems.map((item) =>
          item.kind === "group" ? (
            <GroupedMarketCard
              key={item.key}
              match={match}
              groupLabel={item.groupLabel}
              markets={item.markets}
              expanded={expandedGroups[item.key] ?? false}
              onToggleExpanded={() => toggleGroup(item.key)}
            />
          ) : (
            <Card
              key={item.key}
              className={cn("border-border/80", item.market.odds.length > 6 && "sm:col-span-2")}
            >
              <CardContent className="p-4">
                <MarketOddsRow match={match} market={item.market} />
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
