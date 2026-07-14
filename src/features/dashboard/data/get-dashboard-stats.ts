import { prisma } from "@/lib/prisma";

export interface DashboardStreak {
  type: "WON" | "LOST" | "NONE";
  count: number;
}

export interface DashboardStats {
  balance: number;
  totalBets: number;
  openBets: number;
  wonBets: number;
  lostBets: number;
  cancelledBets: number;
  winrate: number;
  roi: number;
  profit: number;
  avgOdd: number;
  streak: DashboardStreak;
}

/**
 * Estatísticas do Perfil (dashboard). Calculadas em memória a partir das
 * apostas do usuário — volume esperado é baixo (simulação com Coins), então
 * não há necessidade de agregações no banco por enquanto.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [wallet, bets] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: "desc" },
      include: { selections: true },
    }),
  ]);

  const wonBets = bets.filter((bet) => bet.status === "WON");
  const lostBets = bets.filter((bet) => bet.status === "LOST");
  const openBets = bets.filter((bet) => bet.status === "OPEN");
  const cancelledBets = bets.filter((bet) => bet.status === "CANCELLED");
  const settledCount = wonBets.length + lostBets.length;

  const totalStakedSettled = [...wonBets, ...lostBets].reduce((sum, bet) => sum + bet.stake, 0);
  const totalReturns = wonBets.reduce((sum, bet) => sum + (bet.actualReturn ?? 0), 0);
  const profit = totalReturns - totalStakedSettled;
  const roi = totalStakedSettled > 0 ? (profit / totalStakedSettled) * 100 : 0;
  const winrate = settledCount > 0 ? (wonBets.length / settledCount) * 100 : 0;

  const allSelections = bets.flatMap((bet) => bet.selections);
  const avgOdd =
    allSelections.length > 0
      ? allSelections.reduce((sum, selection) => sum + selection.oddValue, 0) /
        allSelections.length
      : 0;

  let streakType: DashboardStreak["type"] = "NONE";
  let streakCount = 0;
  for (const bet of bets) {
    if (bet.status !== "WON" && bet.status !== "LOST") continue;

    if (streakType === "NONE") {
      streakType = bet.status;
      streakCount = 1;
    } else if (bet.status === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  return {
    balance: wallet?.balance ?? 0,
    totalBets: bets.length,
    openBets: openBets.length,
    wonBets: wonBets.length,
    lostBets: lostBets.length,
    cancelledBets: cancelledBets.length,
    winrate,
    roi,
    profit,
    avgOdd,
    streak: { type: streakType, count: streakCount },
  };
}
