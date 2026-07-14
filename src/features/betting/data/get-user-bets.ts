import type { BetStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getUserBets(userId: string, status?: BetStatus) {
  return prisma.bet.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    orderBy: { placedAt: "desc" },
    include: {
      // Precisa do status/horário da partida para decidir se a aposta ainda
      // pode ser encerrada pelo usuário — ver `can-cancel-bet.ts`.
      selections: { include: { match: { select: { status: true, startTime: true } } } },
    },
  });
}

export type UserBetWithSelections = Awaited<ReturnType<typeof getUserBets>>[number];

export function isBetStatus(value: string | undefined): value is BetStatus {
  return value === "OPEN" || value === "WON" || value === "LOST" || value === "CANCELLED";
}
