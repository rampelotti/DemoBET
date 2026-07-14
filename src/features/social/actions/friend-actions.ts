"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface SocialActionResult {
  success: boolean;
  message: string;
}

async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function sendFriendRequest(targetUserId: string): Promise<SocialActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Faça login para adicionar amigos." };
  if (userId === targetUserId) return { success: false, message: "Você não pode adicionar a si mesmo." };

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: userId },
      ],
    },
  });

  if (existing?.status === "ACCEPTED") {
    return { success: false, message: "Vocês já são amigos." };
  }
  if (existing?.status === "PENDING") {
    return { success: false, message: "Já existe uma solicitação pendente." };
  }

  if (existing?.status === "REJECTED") {
    await prisma.friendship.update({
      where: { id: existing.id },
      data: { status: "PENDING", requesterId: userId, addresseeId: targetUserId },
    });
  } else {
    await prisma.friendship.create({
      data: { requesterId: userId, addresseeId: targetUserId },
    });
  }

  revalidateSocial();
  return { success: true, message: "Solicitação de amizade enviada." };
}

export async function respondToFriendRequest(
  friendshipId: string,
  accept: boolean
): Promise<SocialActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Faça login para responder." };

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== userId || friendship.status !== "PENDING") {
    return { success: false, message: "Solicitação não encontrada." };
  }

  await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: accept ? "ACCEPTED" : "REJECTED" },
  });

  revalidateSocial();
  return {
    success: true,
    message: accept ? "Amizade aceita!" : "Solicitação recusada.",
  };
}

export async function removeFriend(targetUserId: string): Promise<SocialActionResult> {
  const userId = await requireUserId();
  if (!userId) return { success: false, message: "Faça login para remover amigos." };

  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: userId, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: userId },
      ],
    },
  });

  if (!friendship) return { success: false, message: "Amizade não encontrada." };

  await prisma.friendship.delete({ where: { id: friendship.id } });
  revalidateSocial();
  return { success: true, message: "Amigo removido." };
}

function revalidateSocial() {
  revalidatePath("/social");
  revalidatePath("/social/amigos");
  revalidatePath("/social/ranking");
  revalidatePath("/u", "layout");
}
