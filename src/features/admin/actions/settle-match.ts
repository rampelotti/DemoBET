"use server";

import { getCurrentAdmin } from "@/features/admin/data/get-current-admin";
import {
  normalizePlayerKey,
  type MatchSettleContext,
} from "@/features/admin/lib/resolve-selection-result";
import { settleMatchCore } from "@/features/betting/lib/settle-match-core";

export interface SettleMatchResult {
  success: boolean;
  message?: string;
}

export interface SettleMatchInput {
  homeScore: number;
  awayScore: number;
  homeScoreHt?: number | null;
  awayScoreHt?: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeCards?: number | null;
  awayCards?: number | null;
  /** Nomes separados por vírgula. Vazio = não liquidar mercados de jogador. */
  goalScorersText?: string;
  firstScorerText?: string;
  lastScorerText?: string;
  cardedPlayersText?: string;
  redCardPlayersText?: string;
}

function parseOptionalInt(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}

function parseNameList(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((part) => normalizePlayerKey(part.trim()))
    .filter(Boolean);
}

export async function settleMatch(
  matchId: string,
  input: SettleMatchInput
): Promise<SettleMatchResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, message: "Não autorizado." };
  }

  const { homeScore, awayScore } = input;
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore < 0 || awayScore < 0) {
    return { success: false, message: "Informe um placar válido." };
  }

  const homeScoreHt = parseOptionalInt(input.homeScoreHt ?? undefined);
  const awayScoreHt = parseOptionalInt(input.awayScoreHt ?? undefined);
  const homeCorners = parseOptionalInt(input.homeCorners ?? undefined);
  const awayCorners = parseOptionalInt(input.awayCorners ?? undefined);
  const homeCards = parseOptionalInt(input.homeCards ?? undefined);
  const awayCards = parseOptionalInt(input.awayCards ?? undefined);

  const context: MatchSettleContext = {
    homeScore,
    awayScore,
  };

  if (homeScoreHt !== undefined && awayScoreHt !== undefined) {
    context.homeScoreHt = homeScoreHt;
    context.awayScoreHt = awayScoreHt;
  }
  if (homeCorners !== undefined && awayCorners !== undefined) {
    context.homeCorners = homeCorners;
    context.awayCorners = awayCorners;
  }
  if (homeCards !== undefined && awayCards !== undefined) {
    context.homeCards = homeCards;
    context.awayCards = awayCards;
  }

  const scorersText = input.goalScorersText?.trim();
  if (scorersText) {
    context.goalScorers = parseNameList(scorersText);
  }

  const first = input.firstScorerText?.trim();
  if (first) context.firstScorer = normalizePlayerKey(first);

  const last = input.lastScorerText?.trim();
  if (last) context.lastScorer = normalizePlayerKey(last);

  const carded = input.cardedPlayersText?.trim();
  if (carded) context.cardedPlayers = parseNameList(carded);

  const reds = input.redCardPlayersText?.trim();
  if (reds) {
    context.redCardPlayers = parseNameList(reds);
  } else if (carded) {
    // Se informou cartões mas nenhum vermelho, assume lista vazia (ninguém vermelho).
    context.redCardPlayers = [];
  }

  await settleMatchCore(matchId, context, admin.email);

  return { success: true };
}
