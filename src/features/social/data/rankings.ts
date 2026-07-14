import { getDashboardStats, type DashboardStats } from "@/features/dashboard/data/get-dashboard-stats";
import { prisma } from "@/lib/prisma";

export interface RankedUser {
  id: string;
  name: string;
  username: string | null;
  stats: DashboardStats;
}

async function rankUsers(userIds: string[]): Promise<RankedUser[]> {
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true },
  });

  const ranked = await Promise.all(
    users.map(async (user) => ({
      ...user,
      stats: await getDashboardStats(user.id),
    }))
  );

  return ranked.sort((a, b) => {
    if (b.stats.profit !== a.stats.profit) return b.stats.profit - a.stats.profit;
    if (b.stats.roi !== a.stats.roi) return b.stats.roi - a.stats.roi;
    return b.stats.winrate - a.stats.winrate;
  });
}

export async function getPlatformRanking(limit = 20): Promise<RankedUser[]> {
  const users = await prisma.user.findMany({
    select: { id: true },
    take: 80,
    orderBy: { createdAt: "desc" },
  });

  return (await rankUsers(users.map((user) => user.id))).slice(0, limit);
}

export async function getGroupRanking(groupId: string): Promise<RankedUser[]> {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    select: { userId: true },
  });

  return rankUsers(members.map((member) => member.userId));
}

export async function getFriendsRanking(userId: string): Promise<RankedUser[]> {
  const { getFriendIds } = await import("@/features/social/data/friends");
  const friendIds = await getFriendIds(userId);
  return rankUsers([userId, ...friendIds]);
}
