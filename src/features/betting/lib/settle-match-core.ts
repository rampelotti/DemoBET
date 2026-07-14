import { revalidatePath } from "next/cache";

import {
  resolveSelectionResult,
  type MatchSettleContext,
} from "@/features/admin/lib/resolve-selection-result";
import { prisma } from "@/lib/prisma";

export interface SettleMatchCoreResult {
  betsSettled: number;
}

export type SettleMatchStats = MatchSettleContext;

/**
 * Núcleo da liquidação: resolve todos os mercados possíveis com o contexto
 * informado (FT obrigatório; HT/escanteios/cartões/artílheiros opcionais).
 */
export async function settleMatchCore(
  matchId: string,
  context: SettleMatchStats,
  actorLabel: string,
  options?: { skipRevalidate?: boolean }
): Promise<SettleMatchCoreResult> {
  const homeScore = Math.round(context.homeScore);
  const awayScore = Math.round(context.awayScore);

  const settleContext: MatchSettleContext = {
    ...context,
    homeScore,
    awayScore,
  };

  const affectedBetIds = await prisma.$transaction(
    async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: {
          status: "FINISHED",
          homeScore,
          awayScore,
          resultStats: {
            homeScoreHt: context.homeScoreHt ?? null,
            awayScoreHt: context.awayScoreHt ?? null,
            homeCorners: context.homeCorners ?? null,
            awayCorners: context.awayCorners ?? null,
            homeCards: context.homeCards ?? null,
            awayCards: context.awayCards ?? null,
            goalScorers: context.goalScorers ?? null,
            firstScorer: context.firstScorer ?? null,
            lastScorer: context.lastScorer ?? null,
            cardedPlayers: context.cardedPlayers ?? null,
            redCardPlayers: context.redCardPlayers ?? null,
          },
        },
      });

      const pendingSelections = await tx.betSelection.findMany({
        where: { matchId, result: "PENDING" },
        include: { odd: { include: { market: true } } },
      });

      for (const selection of pendingSelections) {
        const result = resolveSelectionResult(
          selection.odd.market.type,
          selection.odd.selection,
          settleContext
        );
        await tx.betSelection.update({ where: { id: selection.id }, data: { result } });
      }

      const betIds = Array.from(new Set(pendingSelections.map((selection) => selection.betId)));

      for (const betId of betIds) {
        const bet = await tx.bet.findUnique({ where: { id: betId }, include: { selections: true } });
        if (!bet || bet.status !== "OPEN") continue;

        const stillPending = bet.selections.some((selection) => selection.result === "PENDING");
        if (stillPending) continue;

        const hasLost = bet.selections.some((selection) => selection.result === "LOST");
        const hasWon = bet.selections.some((selection) => selection.result === "WON");

        let status: "WON" | "LOST" | "CANCELLED";
        let actualReturn: number;

        if (hasLost) {
          status = "LOST";
          actualReturn = 0;
        } else if (hasWon) {
          status = "WON";
          actualReturn = bet.potentialReturn;
        } else {
          // Todas VOID (push / sem dados) → estorno
          status = "CANCELLED";
          actualReturn = bet.stake;
        }

        await tx.bet.update({
          where: { id: bet.id },
          data: { status, actualReturn, settledAt: new Date() },
        });

        if (actualReturn > 0) {
          const wallet = await tx.wallet.findUnique({ where: { userId: bet.userId } });
          if (wallet) {
            const updatedWallet = await tx.wallet.update({
              where: { userId: bet.userId },
              data: { balance: { increment: actualReturn } },
            });

            await tx.transaction.create({
              data: {
                walletId: wallet.id,
                type: status === "WON" ? "BET_WON" : "BET_REFUND",
                amount: actualReturn,
                balanceAfter: updatedWallet.balance,
                betId: bet.id,
              },
            });
          }
        }
      }

      await tx.adminLog.create({
        data: {
          adminEmail: actorLabel,
          action: "SETTLE_MATCH",
          targetType: "Match",
          targetId: matchId,
          metadata: {
            homeScore,
            awayScore,
            betsSettled: betIds.length,
            stats: JSON.parse(JSON.stringify(settleContext)) as object,
          },
        },
      });

      return betIds;
    },
    { timeout: 15000 }
  );

  if (!options?.skipRevalidate) {
    revalidatePath("/admin/matches");
    revalidatePath("/admin/bets");
    revalidatePath("/admin/logs");
    revalidatePath("/dashboard");
    revalidatePath("/meus-palpites");
    revalidatePath("/");
  }

  return { betsSettled: affectedBetIds.length };
}
