import { BetStatus } from "@prisma/client";

import {
  emptyPerformanceData,
  type AccumulableRow,
} from "@/features/performance/data/empty-performance-data";
import type {
  BankrollPoint,
  PerformanceBreakdownRow,
  PerformanceData,
  PerformanceInsights,
} from "@/features/performance/types";
import { prisma } from "@/lib/prisma";

/** Lucro em unidades: 1 u. = 50 Coins (stake padrão do cupom). */
const UNIT_SIZE = 50;

function toUnits(coins: number): number {
  return coins / UNIT_SIZE;
}

function marketFamily(marketLabel: string): string {
  const separator = marketLabel.indexOf(" - ");
  return separator > 0 ? marketLabel.slice(0, separator) : marketLabel;
}

function isLineMarket(marketLabel: string): boolean {
  return (
    marketLabel.includes("Mais/Menos") ||
    marketLabel.startsWith("Handicap") ||
    /\d+\.\d/.test(marketLabel)
  );
}

function oddsRangeLabel(odd: number): string {
  if (odd <= 1.5) return "1.01 – 1.50";
  if (odd <= 2) return "1.51 – 2.00";
  if (odd <= 3) return "2.01 – 3.00";
  if (odd <= 5) return "3.01 – 5.00";
  return "5.01+";
}

function finalizeRows(map: Map<string, AccumulableRow>): PerformanceBreakdownRow[] {
  return [...map.values()]
    .map((row) => {
      const winRate = row.bets > 0 ? (row.wins / row.bets) * 100 : 0;
      const roi = row.staked > 0 ? (row.profitCoins / row.staked) * 100 : 0;
      return {
        label: row.label,
        bets: row.bets,
        wins: row.wins,
        losses: row.losses,
        winRate,
        roi,
        profitUnits: toUnits(row.profitCoins),
      };
    })
    .sort((a, b) => b.bets - a.bets || b.profitUnits - a.profitUnits);
}

function bump(
  map: Map<string, AccumulableRow>,
  label: string,
  won: boolean,
  stake: number,
  profitCoins: number
) {
  const current = map.get(label) ?? {
    label,
    bets: 0,
    wins: 0,
    losses: 0,
    staked: 0,
    profitCoins: 0,
  };
  current.bets += 1;
  if (won) current.wins += 1;
  else current.losses += 1;
  current.staked += stake;
  current.profitCoins += profitCoins;
  map.set(label, current);
}

function bestRowLabel(
  rows: PerformanceBreakdownRow[],
  mode: "max" | "min",
  emptyMessage: string
): string {
  if (rows.length === 0) return emptyMessage;
  const sorted = [...rows].sort((a, b) =>
    mode === "max" ? b.profitUnits - a.profitUnits : a.profitUnits - b.profitUnits
  );
  const top = sorted[0];
  const sign = top.profitUnits >= 0 ? "+" : "";
  return `${top.label} (${sign}${top.profitUnits.toFixed(1).replace(".", ",")} u.)`;
}

function buildInsights(
  byMarket: PerformanceBreakdownRow[],
  byLeague: PerformanceBreakdownRow[],
  byTeam: PerformanceBreakdownRow[],
  byLine: PerformanceBreakdownRow[],
  byOddsRange: PerformanceBreakdownRow[]
): PerformanceInsights {
  const empty = "Ainda sem dados";
  return {
    bestMarket: bestRowLabel(byMarket, "max", empty),
    worstMarket: bestRowLabel(byMarket, "min", empty),
    bestLeague: bestRowLabel(byLeague, "max", empty),
    bestTeam: bestRowLabel(byTeam, "max", empty),
    bestLine: bestRowLabel(byLine, "max", empty),
    bestOddsRange: bestRowLabel(byOddsRange, "max", empty),
  };
}

function buildBankrollFromTransactions(
  transactions: { createdAt: Date; balanceAfter: number }[],
  currentBalance: number
): BankrollPoint[] {
  if (transactions.length === 0) {
    return [
      {
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        balance: currentBalance,
      },
    ];
  }

  // Um ponto por dia (último saldo do dia), dos últimos 30 dias.
  const byDay = new Map<string, { sortKey: string; balance: number; label: string }>();
  for (const tx of transactions) {
    const dayKey = tx.createdAt.toISOString().slice(0, 10);
    const label = tx.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    byDay.set(dayKey, { sortKey: dayKey, balance: tx.balanceAfter, label });
  }

  const points = [...byDay.values()].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  const recent = points.filter((point) => point.sortKey >= cutoff.toISOString().slice(0, 10));
  const series = recent.length > 0 ? recent : points.slice(-30);

  // Garante o saldo atual no fim se o dia de hoje ainda não tiver tx.
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  if (series[series.length - 1]?.sortKey !== todayKey) {
    series.push({ sortKey: todayKey, balance: currentBalance, label: todayLabel });
  } else {
    series[series.length - 1].balance = currentBalance;
  }

  return series.map((point) => ({ date: point.label, balance: point.balance }));
}

/**
 * Agrega o desempenho real do usuário a partir das apostas liquidadas.
 * Conta nova / sem apostas resolvidas → zeros e listas vazias (sem mock).
 */
export async function getPerformanceData(userId: string): Promise<PerformanceData> {
  const [wallet, bets] = await Promise.all([
    prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "asc" },
          select: { createdAt: true, balanceAfter: true, type: true },
        },
      },
    }),
    prisma.bet.findMany({
      where: {
        userId,
        status: { in: [BetStatus.WON, BetStatus.LOST] },
      },
      orderBy: { placedAt: "asc" },
      include: {
        selections: {
          include: {
            match: { select: { homeTeam: true, awayTeam: true, league: true } },
          },
        },
      },
    }),
  ]);

  if (bets.length === 0) {
    // Sem histórico resolvido: não inventa curva nem insights.
    // Só mostra o saldo atual se a carteira existir (ponto único, sem “histórico”).
    const empty = emptyPerformanceData();
    if (wallet) {
      empty.bankroll = [];
    }
    return empty;
  }

  const byMarket = new Map<string, AccumulableRow>();
  const byLeague = new Map<string, AccumulableRow>();
  const byTeam = new Map<string, AccumulableRow>();
  const byLine = new Map<string, AccumulableRow>();
  const byOddsRange = new Map<string, AccumulableRow>();

  let totalStaked = 0;
  let totalProfitCoins = 0;
  let wins = 0;
  let oddSum = 0;
  let oddCount = 0;

  for (const bet of bets) {
    const won = bet.status === BetStatus.WON;
    const profitCoins = won
      ? (bet.actualReturn ?? bet.potentialReturn) - bet.stake
      : -bet.stake;

    totalStaked += bet.stake;
    totalProfitCoins += profitCoins;
    if (won) wins += 1;

    const combinedOdd = bet.selections.reduce((product, selection) => product * selection.oddValue, 1);
    oddSum += combinedOdd;
    oddCount += 1;

    const first = bet.selections[0];
    if (!first) continue;

    bump(byMarket, marketFamily(first.marketLabel), won, bet.stake, profitCoins);
    bump(byLeague, first.match.league, won, bet.stake, profitCoins);
    bump(byTeam, first.match.homeTeam, won, bet.stake, profitCoins);
    bump(byTeam, first.match.awayTeam, won, bet.stake, profitCoins);
    bump(byOddsRange, oddsRangeLabel(combinedOdd), won, bet.stake, profitCoins);

    if (bet.selections.length === 1 && isLineMarket(first.marketLabel)) {
      bump(byLine, first.marketLabel, won, bet.stake, profitCoins);
    }
  }

  const marketRows = finalizeRows(byMarket);
  const leagueRows = finalizeRows(byLeague);
  const teamRows = finalizeRows(byTeam).slice(0, 12);
  const lineRows = finalizeRows(byLine);
  const oddsRows = finalizeRows(byOddsRange);

  const currentBalance = wallet?.balance ?? 10_000;

  return {
    summary: {
      roi: totalStaked > 0 ? (totalProfitCoins / totalStaked) * 100 : 0,
      profitUnits: toUnits(totalProfitCoins),
      winRate: bets.length > 0 ? (wins / bets.length) * 100 : 0,
      totalBets: bets.length,
      avgOdd: oddCount > 0 ? oddSum / oddCount : 0,
    },
    bankroll: buildBankrollFromTransactions(wallet?.transactions ?? [], currentBalance),
    byMarket: marketRows,
    byLeague: leagueRows,
    byTeam: teamRows,
    byLine: lineRows,
    byOddsRange: oddsRows,
    insights: buildInsights(marketRows, leagueRows, teamRows, lineRows, oddsRows),
  };
}
