import { prisma } from "@/lib/prisma";

/** IDs de usuários com amizade aceita (bidirecional). */
export async function getFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return friendships.map((friendship) =>
    friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId
  );
}

export async function areFriends(userId: string, otherUserId: string): Promise<boolean> {
  if (userId === otherUserId) return true;

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: otherUserId },
        { requesterId: otherUserId, addresseeId: userId },
      ],
    },
  });

  return Boolean(friendship);
}

export async function getFriends(userId: string) {
  const friendIds = await getFriendIds(userId);
  if (friendIds.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: {
      id: true,
      name: true,
      username: true,
      wallet: { select: { balance: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getPendingFriendRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: {
      requester: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSentFriendRequests(userId: string) {
  return prisma.friendship.findMany({
    where: { requesterId: userId, status: "PENDING" },
    include: {
      addressee: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
