import type { BetStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getAllBets(status?: BetStatus) {
  return prisma.bet.findMany({
    where: status ? { status } : undefined,
    orderBy: { placedAt: "desc" },
    take: 100,
    include: {
      selections: true,
      user: { select: { name: true, email: true } },
    },
  });
}

export type AdminBetRow = Awaited<ReturnType<typeof getAllBets>>[number];
