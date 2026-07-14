import { prisma } from "@/lib/prisma";

export async function getAdminLogs() {
  return prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export type AdminLogRow = Awaited<ReturnType<typeof getAdminLogs>>[number];
