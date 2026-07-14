import { prisma } from "@/lib/prisma";

export async function getAllMatches() {
  return prisma.match.findMany({
    orderBy: { startTime: "desc" },
    include: {
      _count: { select: { betSelections: true } },
    },
  });
}

export type AdminMatchRow = Awaited<ReturnType<typeof getAllMatches>>[number];

export async function getMatchWithDetails(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      markets: { include: { odds: true } },
      betSelections: {
        include: { bet: true, odd: true },
      },
    },
  });
}
