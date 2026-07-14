"use server";

import { getCurrentAdmin } from "@/features/admin/data/get-current-admin";
import { settleMatchCore } from "@/features/betting/lib/settle-match-core";

export interface SettleMatchResult {
  success: boolean;
  message?: string;
}

export async function settleMatch(
  matchId: string,
  homeScore: number,
  awayScore: number
): Promise<SettleMatchResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, message: "Não autorizado." };
  }

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return { success: false, message: "Informe um placar válido." };
  }

  await settleMatchCore(matchId, homeScore, awayScore, admin.email);

  return { success: true };
}
