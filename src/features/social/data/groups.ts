import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          owner: { select: { id: true, name: true, username: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((membership) => ({
    ...membership.group,
    role: membership.role,
    memberCount: membership.group._count.members,
  }));
}

export async function getGroupBySlug(slug: string, userId?: string) {
  const group = await prisma.group.findUnique({
    where: { slug },
    include: {
      owner: { select: { id: true, name: true, username: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { members: true } },
    },
  });

  if (!group) return null;

  const isMember = userId
    ? group.members.some((member) => member.userId === userId)
    : false;

  const pendingInvites =
    userId && group.ownerId === userId
      ? await prisma.groupInvite.findMany({
          where: { groupId: group.id, status: "PENDING" },
          include: {
            invitee: { select: { id: true, name: true, username: true } },
          },
        })
      : [];

  return { group, isMember, pendingInvites };
}

export async function generateUniqueGroupSlug(name: string): Promise<string> {
  const base = slugify(name).slice(0, 40) || "grupo";
  let candidate = base;
  let suffix = 0;

  while (true) {
    const existing = await prisma.group.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

export async function getPendingGroupInvites(userId: string) {
  return prisma.groupInvite.findMany({
    where: { inviteeId: userId, status: "PENDING" },
    include: {
      group: { select: { id: true, name: true, slug: true } },
      inviter: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
