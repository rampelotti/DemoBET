"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { generateUniqueGroupSlug } from "@/features/social/data/groups";
import { areFriends } from "@/features/social/data/friends";
import { prisma } from "@/lib/prisma";

export interface SocialActionResult {
  success: boolean;
  message: string;
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createGroup(name: string): Promise<SocialActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Faça login para criar grupos." };

  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { success: false, message: "O nome do grupo deve ter pelo menos 3 caracteres." };
  }

  const slug = await generateUniqueGroupSlug(trimmed);

  await prisma.group.create({
    data: {
      name: trimmed,
      slug,
      ownerId: userId,
      members: {
        create: { userId, role: "OWNER" },
      },
    },
  });

  revalidatePath("/social/grupos");
  return { success: true, message: "Grupo criado com sucesso!" };
}

export async function inviteToGroup(
  groupId: string,
  inviteeId: string
): Promise<SocialActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Faça login para convidar." };

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) return { success: false, message: "Grupo não encontrado." };

  const isMember = group.members.some((member) => member.userId === userId);
  if (!isMember) return { success: false, message: "Você não faz parte deste grupo." };

  const friends = await areFriends(userId, inviteeId);
  if (!friends) return { success: false, message: "Só é possível convidar amigos." };

  const alreadyMember = group.members.some((member) => member.userId === inviteeId);
  if (alreadyMember) return { success: false, message: "Esse usuário já está no grupo." };

  const existingInvite = await prisma.groupInvite.findUnique({
    where: { groupId_inviteeId: { groupId, inviteeId } },
  });

  if (existingInvite?.status === "PENDING") {
    return { success: false, message: "Convite já enviado." };
  }

  if (existingInvite) {
    await prisma.groupInvite.update({
      where: { id: existingInvite.id },
      data: { status: "PENDING", inviterId: userId },
    });
  } else {
    await prisma.groupInvite.create({
      data: { groupId, inviterId: userId, inviteeId },
    });
  }

  revalidatePath(`/social/grupos/${group.slug}`);
  return { success: true, message: "Convite enviado!" };
}

export async function respondToGroupInvite(
  inviteId: string,
  accept: boolean
): Promise<SocialActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Faça login para responder." };

  const invite = await prisma.groupInvite.findUnique({
    where: { id: inviteId },
    include: { group: true },
  });

  if (!invite || invite.inviteeId !== userId || invite.status !== "PENDING") {
    return { success: false, message: "Convite não encontrado." };
  }

  if (accept) {
    await prisma.$transaction(async (tx) => {
      await tx.groupInvite.update({
        where: { id: inviteId },
        data: { status: "ACCEPTED" },
      });
      await tx.groupMember.upsert({
        where: { groupId_userId: { groupId: invite.groupId, userId } },
        create: { groupId: invite.groupId, userId, role: "MEMBER" },
        update: {},
      });
    });
  } else {
    await prisma.groupInvite.update({
      where: { id: inviteId },
      data: { status: "REJECTED" },
    });
  }

  revalidatePath("/social/grupos");
  revalidatePath(`/social/grupos/${invite.group.slug}`);
  return { success: true, message: accept ? "Você entrou no grupo!" : "Convite recusado." };
}
