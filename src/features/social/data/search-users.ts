import { prisma } from "@/lib/prisma";

export type FriendshipRelation =
  | "FRIENDS"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | "NONE";

export async function searchUsersWithRelation(query: string, currentUserId: string) {
  const term = query.trim();
  if (term.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUserId },
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { username: { contains: term, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      username: true,
      wallet: { select: { balance: true } },
    },
    take: 12,
    orderBy: { name: "asc" },
  });

  if (users.length === 0) return [];

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: users.flatMap((user) => [
        { requesterId: currentUserId, addresseeId: user.id },
        { requesterId: user.id, addresseeId: currentUserId },
      ]),
    },
    select: { id: true, requesterId: true, addresseeId: true, status: true },
  });

  return users.map((user) => {
    const friendship = friendships.find(
      (entry) =>
        (entry.requesterId === currentUserId && entry.addresseeId === user.id) ||
        (entry.requesterId === user.id && entry.addresseeId === currentUserId)
    );

    let relation: FriendshipRelation = "NONE";
    let friendshipId: string | undefined;

    if (friendship?.status === "ACCEPTED") relation = "FRIENDS";
    else if (friendship?.status === "PENDING" && friendship.requesterId === currentUserId) {
      relation = "PENDING_SENT";
      friendshipId = friendship.id;
    } else if (friendship?.status === "PENDING") {
      relation = "PENDING_RECEIVED";
      friendshipId = friendship.id;
    }

    return { ...user, relation, friendshipId };
  });
}
