import type { PerformanceData, PerformanceInsights } from "@/features/performance/types";

export interface AccumulableRow {
  label: string;
  bets: number;
  wins: number;
  losses: number;
  staked: number;
  profitCoins: number;
}

const EMPTY_INSIGHTS: PerformanceInsights = {
  bestMarket: "Ainda sem dados",
  worstMarket: "Ainda sem dados",
  bestLeague: "Ainda sem dados",
  bestTeam: "Ainda sem dados",
  bestLine: "Ainda sem dados",
  bestOddsRange: "Ainda sem dados",
};

/** Payload zerado para contas novas / sem apostas liquidadas. */
export function emptyPerformanceData(): PerformanceData {
  return {
    summary: {
      roi: 0,
      profitUnits: 0,
      winRate: 0,
      totalBets: 0,
      avgOdd: 0,
    },
    bankroll: [],
    byMarket: [],
    byLeague: [],
    byTeam: [],
    byLine: [],
    byOddsRange: [],
    insights: EMPTY_INSIGHTS,
  };
}
