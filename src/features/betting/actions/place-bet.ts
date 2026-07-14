"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface PlaceBetSelectionInput {
  oddId: string;
  matchId: string;
  marketLabel: string;
  selectionLabel: string;
  oddValue: number;
}

/**
 * Um grupo = uma aposta. Se tiver 1 seleção é uma aposta simples; se tiver
 * 2+ (sempre da mesma partida, ver `bet-slip.tsx`) é uma aposta múltipla
 * "criar aposta" com odd combinada (produto das odds de cada seleção).
 */
export interface PlaceBetGroupInput {
  stake: number;
  selections: PlaceBetSelectionInput[];
}

export interface PlaceBetResult {
  success: boolean;
  message: string;
}

export async function placeBet(groups: PlaceBetGroupInput[]): Promise<PlaceBetResult> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false, message: "Você precisa entrar na sua conta para apostar." };
  }

  const validGroups = groups.filter(
    (group) => Number.isFinite(group.stake) && group.stake > 0 && group.selections.length > 0
  );

  if (validGroups.length === 0) {
    return {
      success: false,
      message: "Defina um valor de Coins válido para pelo menos uma aposta.",
    };
  }

  const totalStake = validGroups.reduce((sum, group) => sum + Math.round(group.stake), 0);

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }
      if (wallet.balance < totalStake) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      for (const group of validGroups) {
        const stake = Math.round(group.stake);
        const combinedOdd = group.selections.reduce((product, selection) => product * selection.oddValue, 1);
        const potentialReturn = Math.floor(stake * combinedOdd);

        const bet = await tx.bet.create({
          data: {
            userId,
            stake,
            potentialReturn,
            selections: {
              create: group.selections.map((selection) => ({
                oddId: selection.oddId,
                matchId: selection.matchId,
                marketLabel: selection.marketLabel,
                selectionLabel: selection.selectionLabel,
                oddValue: selection.oddValue,
              })),
            },
          },
        });

        const updatedWallet = await tx.wallet.update({
          where: { userId },
          data: { balance: { decrement: stake } },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "BET_PLACED",
            amount: -stake,
            balanceAfter: updatedWallet.balance,
            betId: bet.id,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return { success: false, message: "Saldo de Coins insuficiente para essa aposta." };
    }
    return { success: false, message: "Não foi possível confirmar a aposta. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/meus-palpites");

  return { success: true, message: "Aposta confirmada com sucesso!" };
}
