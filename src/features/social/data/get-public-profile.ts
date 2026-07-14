import type { BetStatus } from "@prisma/client";

import { getDashboardStats } from "@/features/dashboard/data/get-dashboard-stats";
import { areFriends } from "@/features/social/data/friends";
import { getUserBets } from "@/features/betting/data/get-user-bets";
import { ensureUsername } from "@/lib/username";
import { prisma } from "@/lib/prisma";

export async function getPublicProfile(username: string, viewerId?: string) {
  const user = await prisma.user.findFirst({
    where: { username },
    select: { id: true, name: true, username: true, createdAt: true },
  });

  if (!user) return null;

  if (!user.username) {
    const ensured = await ensureUsername(user.id);
    user.username = ensured;
  }

  const [stats, isFriend, viewerIsSelf] = await Promise.all([
    getDashboardStats(user.id),
    viewerId ? areFriends(viewerId, user.id) : Promise.resolve(false),
    Promise.resolve(viewerId === user.id),
  ]);

  const canViewFullHistory = viewerIsSelf || isFriend;
  const bets = canViewFullHistory
    ? (await getUserBets(user.id)).slice(0, 10)
    : (await getUserBets(user.id))
        .filter((bet) => bet.status === "WON" || bet.status === "LOST")
        .slice(0, 3);

  return {
    user,
    stats,
    isFriend,
    viewerIsSelf,
    canViewFullHistory,
    bets,
  };
}

export async function getFriendshipState(
  viewerId: string,
  targetUserId: string
): Promise<{
  state: "SELF" | "FRIENDS" | "PENDING_SENT" | "PENDING_RECEIVED" | "NONE";
  friendshipId?: string;
}> {
  if (viewerId === targetUserId) return { state: "SELF" };

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: viewerId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: viewerId },
      ],
    },
  });

  if (!friendship) return { state: "NONE" };
  if (friendship.status === "ACCEPTED") return { state: "FRIENDS", friendshipId: friendship.id };
  if (friendship.status === "PENDING" && friendship.requesterId === viewerId) {
    return { state: "PENDING_SENT", friendshipId: friendship.id };
  }
  if (friendship.status === "PENDING") {
    return { state: "PENDING_RECEIVED", friendshipId: friendship.id };
  }
  return { state: "NONE" };
}

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

export type PublicProfileBetStatus = BetStatus;
