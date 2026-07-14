import { prisma } from "@/lib/prisma";

export interface AdminOverview {
  totalUsers: number;
  totalMatches: number;
  scheduledMatches: number;
  totalBets: number;
  openBets: number;
  coinsInCirculation: number;
  coinsStaked: number;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const [totalUsers, totalMatches, scheduledMatches, totalBets, openBets, wallets, stakedBets] =
    await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: "SCHEDULED" } }),
      prisma.bet.count(),
      prisma.bet.count({ where: { status: "OPEN" } }),
      prisma.wallet.findMany({ select: { balance: true } }),
      prisma.bet.findMany({ where: { status: "OPEN" }, select: { stake: true } }),
    ]);

  return {
    totalUsers,
    totalMatches,
    scheduledMatches,
    totalBets,
    openBets,
    coinsInCirculation: wallets.reduce((sum, wallet) => sum + wallet.balance, 0),
    coinsStaked: stakedBets.reduce((sum, bet) => sum + bet.stake, 0),
  };
}
