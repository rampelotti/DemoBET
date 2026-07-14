import { revalidatePath } from "next/cache";

import { resolveSelectionResult } from "@/features/admin/lib/resolve-selection-result";
import { prisma } from "@/lib/prisma";

export interface SettleMatchCoreResult {
  betsSettled: number;
}

/**
 * Núcleo da liquidação de uma partida: fecha o placar, resolve seleções
 * pendentes, atualiza apostas e credita Coins de quem ganhou. Usado tanto
 * pela ação administrativa (`settle-match.ts`, placar informado manualmente)
 * quanto pela liquidação automática de partidas importadas da The Odds API
 * (`settleFinishedOddsApiMatches`, placar vindo da API) — `actorLabel`
 * identifica quem/o que disparou a liquidação no log de auditoria.
 */
export async function settleMatchCore(
  matchId: string,
  homeScore: number,
  awayScore: number,
  actorLabel: string,
  options?: { skipRevalidate?: boolean }
): Promise<SettleMatchCoreResult> {
  const affectedBetIds = await prisma.$transaction(
    async (tx) => {
      await tx.match.update({
        where: { id: matchId },
        data: { status: "FINISHED", homeScore: Math.round(homeScore), awayScore: Math.round(awayScore) },
      });

      const pendingSelections = await tx.betSelection.findMany({
        where: { matchId, result: "PENDING" },
        include: { odd: { include: { market: true } } },
      });

      for (const selection of pendingSelections) {
        const result = resolveSelectionResult(
          selection.odd.market.type,
          selection.odd.selection,
          homeScore,
          awayScore
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
          metadata: { homeScore, awayScore, betsSettled: betIds.length },
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
