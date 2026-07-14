import { prisma } from "@/lib/prisma";

export async function getAllUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      wallet: true,
      _count: { select: { bets: true } },
    },
  });
}

export type AdminUserRow = Awaited<ReturnType<typeof getAllUsers>>[number];
