"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { hasMatchStarted } from "@/features/betting/lib/can-cancel-bet";
import { prisma } from "@/lib/prisma";

export interface CancelBetResult {
  success: boolean;
  message: string;
}

/**
 * "Encerrar aposta": permite ao usuário cancelar uma aposta em aberto e
 * receber os Coins apostados de volta — mas só até o horário de início da
 * partida. Depois que a partida começa (fica "live"), não é mais possível
 * encerrar, assim como nas casas de apostas reais.
 */
export async function cancelBet(betId: string): Promise<CancelBetResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, message: "Você precisa entrar na sua conta." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const bet = await tx.bet.findUnique({
        where: { id: betId },
        include: { selections: { include: { match: true } } },
      });

      if (!bet || bet.userId !== userId) {
        throw new Error("NOT_FOUND");
      }
      if (bet.status !== "OPEN") {
        throw new Error("NOT_OPEN");
      }
      if (bet.selections.some((selection) => hasMatchStarted(selection.match))) {
        throw new Error("MATCH_STARTED");
      }

      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: bet.stake } },
      });

      await tx.bet.update({
        where: { id: bet.id },
        data: { status: "CANCELLED", actualReturn: bet.stake, settledAt: new Date() },
      });

      await tx.betSelection.updateMany({
        where: { betId: bet.id },
        data: { result: "VOID" },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "BET_REFUND",
          amount: bet.stake,
          balanceAfter: updatedWallet.balance,
          betId: bet.id,
          note: "Aposta encerrada pelo usuário antes do início da partida",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MATCH_STARTED") {
      return { success: false, message: "Não é possível encerrar: a partida já começou." };
    }
    if (error instanceof Error && error.message === "NOT_OPEN") {
      return { success: false, message: "Essa aposta já foi liquidada." };
    }
    return { success: false, message: "Não foi possível encerrar a aposta. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/meus-palpites");
  revalidatePath("/");

  return { success: true, message: "Aposta encerrada. Os Coins voltaram para sua carteira." };
}
