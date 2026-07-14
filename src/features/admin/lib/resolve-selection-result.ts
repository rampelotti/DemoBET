import { slugify } from "@/lib/slug";

/**
 * Contexto de liquidação de uma partida.
 * Placar final é obrigatório. HT / escanteios / cartões / artílheiros
 * são opcionais: sem eles, mercados que dependem desses dados viram VOID
 * (estorno) em vez de resolvidos no chute.
 */
export interface MatchSettleContext {
  homeScore: number;
  awayScore: number;
  homeScoreHt?: number | null;
  awayScoreHt?: number | null;
  homeCorners?: number | null;
  awayCorners?: number | null;
  homeCards?: number | null;
  awayCards?: number | null;
  /** Nomes já normalizados (slug uppercase) dos marcadores. */
  goalScorers?: string[];
  firstScorer?: string | null;
  lastScorer?: string | null;
  cardedPlayers?: string[];
  redCardPlayers?: string[];
}

export type SelectionOutcome = "WON" | "LOST" | "VOID";

function asScorePair(
  a: number | null | undefined,
  b: number | null | undefined
): { home: number; away: number } | null {
  if (typeof a !== "number" || typeof b !== "number") return null;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { home: a, away: b };
}

function resolve1x2(home: number, away: number, selection: string): SelectionOutcome {
  const outcome = home === away ? "DRAW" : home > away ? "HOME" : "AWAY";
  return selection === outcome ? "WON" : "LOST";
}

function resolveDoubleChance(home: number, away: number, selection: string): SelectionOutcome {
  const isDraw = home === away;
  const homeWon = home > away;
  const awayWon = away > home;
  if (selection === "HOME_OR_DRAW") return homeWon || isDraw ? "WON" : "LOST";
  if (selection === "HOME_OR_AWAY") return !isDraw ? "WON" : "LOST";
  if (selection === "DRAW_OR_AWAY") return awayWon || isDraw ? "WON" : "LOST";
  return "VOID";
}

function resolveOverUnder(total: number, line: number, selection: string): SelectionOutcome {
  if (Number.isNaN(line)) return "VOID";
  if (total === line) return "VOID";
  const outcome = total > line ? "OVER" : "UNDER";
  return selection === outcome ? "WON" : "LOST";
}

/**
 * Handicap asiático. Margens de ¼ (ex.: ±0.25) que seriam "meio ganho/meio
 * perda" nas casas viram VOID (estorno) — sem enum HALF no schema. Linhas
 * cheias / .5 resolvem normalmente; empate na linha → VOID (push).
 */
function resolveAsianHandicap(
  teamScore: number,
  oppScore: number,
  handicap: number
): SelectionOutcome {
  const margin = teamScore - oppScore + handicap;
  if (margin > 0.25) return "WON";
  if (margin < -0.25) return "LOST";
  // push (0) ou meia-linha (±0.25)
  return "VOID";
}

function parseSpreadSelection(selection: string): { side: "HOME" | "AWAY"; line: number } | null {
  const match = /^(HOME|AWAY)_([+-]?[\d.]+)$/.exec(selection);
  if (!match) return null;
  const line = Number(match[2]);
  if (Number.isNaN(line)) return null;
  return { side: match[1] as "HOME" | "AWAY", line };
}

function extractLineSuffix(type: string, prefix: string): number {
  return Number(type.slice(prefix.length));
}

function normalizeToken(value: string): string {
  return slugify(value).toUpperCase().replace(/-/g, "_");
}

function htFtOutcome(htHome: number, htAway: number, ftHome: number, ftAway: number): string {
  const ht = htHome === htAway ? "DRAW" : htHome > htAway ? "HOME" : "AWAY";
  const ft = ftHome === ftAway ? "DRAW" : ftHome > ftAway ? "HOME" : "AWAY";
  return `${ht}_${ft}`;
}

/**
 * Resolve o resultado de uma seleção a partir do placar/estatísticas.
 * Mercado sem dados necessários → VOID (não inventa resultado).
 */
export function resolveSelectionResult(
  marketType: string,
  selection: string,
  context: MatchSettleContext
): SelectionOutcome {
  const {
    homeScore,
    awayScore,
    homeScoreHt,
    awayScoreHt,
    homeCorners,
    awayCorners,
    homeCards,
    awayCards,
  } = context;

  // —— Tempo regulamentar (placar final) ————————————————————————————————

  if (marketType === "MATCH_WINNER") {
    return resolve1x2(homeScore, awayScore, selection);
  }

  if (marketType === "DRAW_NO_BET" || marketType === "TO_QUALIFY") {
    if (homeScore === awayScore) return "VOID";
    return resolve1x2(homeScore, awayScore, selection);
  }

  if (marketType === "DOUBLE_CHANCE") {
    return resolveDoubleChance(homeScore, awayScore, selection);
  }

  if (marketType === "CORRECT_SCORE") {
    return selection === `${homeScore}-${awayScore}` ? "WON" : "LOST";
  }

  if (marketType.startsWith("OVER_UNDER_") && !marketType.startsWith("OVER_UNDER_H1_")) {
    const line = extractLineSuffix(marketType, "OVER_UNDER_");
    return resolveOverUnder(homeScore + awayScore, line, selection);
  }

  if (marketType.startsWith("TEAM_TOTAL_HOME_") && !marketType.includes("_H1_")) {
    const line = extractLineSuffix(marketType, "TEAM_TOTAL_HOME_");
    return resolveOverUnder(homeScore, line, selection);
  }

  if (marketType.startsWith("TEAM_TOTAL_AWAY_") && !marketType.includes("_H1_")) {
    const line = extractLineSuffix(marketType, "TEAM_TOTAL_AWAY_");
    return resolveOverUnder(awayScore, line, selection);
  }

  if (marketType === "BOTH_TEAMS_SCORE") {
    const outcome = homeScore > 0 && awayScore > 0 ? "YES" : "NO";
    return selection === outcome ? "WON" : "LOST";
  }

  // Handicap de gols (FT)
  if (
    marketType.startsWith("SPREADS_") &&
    !marketType.startsWith("SPREADS_H1_") &&
    !marketType.startsWith("SPREADS_CORNERS_") &&
    !marketType.startsWith("SPREADS_CARDS_")
  ) {
    const parsed = parseSpreadSelection(selection);
    if (!parsed) return "VOID";
    if (parsed.side === "HOME") {
      return resolveAsianHandicap(homeScore, awayScore, parsed.line);
    }
    return resolveAsianHandicap(awayScore, homeScore, parsed.line);
  }

  // —— 1º tempo (precisa placar HT) ————————————————————————————————————

  const ht = asScorePair(homeScoreHt, awayScoreHt);
  if (ht) {
    if (marketType === "MATCH_WINNER_H1") {
      return resolve1x2(ht.home, ht.away, selection);
    }

    if (marketType === "DOUBLE_CHANCE_H1") {
      return resolveDoubleChance(ht.home, ht.away, selection);
    }

    if (marketType === "CORRECT_SCORE_H1") {
      return selection === `${ht.home}-${ht.away}` ? "WON" : "LOST";
    }

    if (marketType === "BOTH_TEAMS_SCORE_H1") {
      const outcome = ht.home > 0 && ht.away > 0 ? "YES" : "NO";
      return selection === outcome ? "WON" : "LOST";
    }

    if (marketType.startsWith("OVER_UNDER_H1_")) {
      const line = extractLineSuffix(marketType, "OVER_UNDER_H1_");
      return resolveOverUnder(ht.home + ht.away, line, selection);
    }

    if (marketType.startsWith("TEAM_TOTAL_H1_HOME_")) {
      const line = extractLineSuffix(marketType, "TEAM_TOTAL_H1_HOME_");
      return resolveOverUnder(ht.home, line, selection);
    }

    if (marketType.startsWith("TEAM_TOTAL_H1_AWAY_")) {
      const line = extractLineSuffix(marketType, "TEAM_TOTAL_H1_AWAY_");
      return resolveOverUnder(ht.away, line, selection);
    }

    if (marketType.startsWith("SPREADS_H1_")) {
      const parsed = parseSpreadSelection(selection);
      if (!parsed) return "VOID";
      if (parsed.side === "HOME") {
        return resolveAsianHandicap(ht.home, ht.away, parsed.line);
      }
      return resolveAsianHandicap(ht.away, ht.home, parsed.line);
    }

    if (marketType === "HALFTIME_FULLTIME") {
      const expected = htFtOutcome(ht.home, ht.away, homeScore, awayScore);
      if (selection === expected) return "WON";
      return "LOST";
    }
  } else if (
    marketType === "MATCH_WINNER_H1" ||
    marketType === "DOUBLE_CHANCE_H1" ||
    marketType === "CORRECT_SCORE_H1" ||
    marketType === "BOTH_TEAMS_SCORE_H1" ||
    marketType.startsWith("OVER_UNDER_H1_") ||
    marketType.startsWith("TEAM_TOTAL_H1_") ||
    marketType.startsWith("SPREADS_H1_") ||
    marketType === "HALFTIME_FULLTIME"
  ) {
    return "VOID";
  }

  // —— Escanteios ———————————————————————————————————————————————————————

  const corners = asScorePair(homeCorners, awayCorners);
  if (corners) {
    if (marketType === "CORNERS_WINNER") {
      return resolve1x2(corners.home, corners.away, selection);
    }
    if (marketType.startsWith("CORNERS_OVER_UNDER_")) {
      const line = extractLineSuffix(marketType, "CORNERS_OVER_UNDER_");
      return resolveOverUnder(corners.home + corners.away, line, selection);
    }
    if (marketType.startsWith("CORNERS_TEAM_TOTAL_HOME_")) {
      const line = extractLineSuffix(marketType, "CORNERS_TEAM_TOTAL_HOME_");
      return resolveOverUnder(corners.home, line, selection);
    }
    if (marketType.startsWith("CORNERS_TEAM_TOTAL_AWAY_")) {
      const line = extractLineSuffix(marketType, "CORNERS_TEAM_TOTAL_AWAY_");
      return resolveOverUnder(corners.away, line, selection);
    }
    if (marketType.startsWith("SPREADS_CORNERS_")) {
      const parsed = parseSpreadSelection(selection);
      if (!parsed) return "VOID";
      if (parsed.side === "HOME") {
        return resolveAsianHandicap(corners.home, corners.away, parsed.line);
      }
      return resolveAsianHandicap(corners.away, corners.home, parsed.line);
    }
  } else if (
    marketType === "CORNERS_WINNER" ||
    marketType.startsWith("CORNERS_") ||
    marketType.startsWith("SPREADS_CORNERS_")
  ) {
    return "VOID";
  }

  // —— Cartões ——————————————————————————————————————————————————————————

  const cards = asScorePair(homeCards, awayCards);
  if (cards) {
    if (marketType.startsWith("CARDS_OVER_UNDER_")) {
      const line = extractLineSuffix(marketType, "CARDS_OVER_UNDER_");
      return resolveOverUnder(cards.home + cards.away, line, selection);
    }
    if (marketType.startsWith("SPREADS_CARDS_")) {
      const parsed = parseSpreadSelection(selection);
      if (!parsed) return "VOID";
      if (parsed.side === "HOME") {
        return resolveAsianHandicap(cards.home, cards.away, parsed.line);
      }
      return resolveAsianHandicap(cards.away, cards.home, parsed.line);
    }
  } else if (marketType.startsWith("CARDS_") || marketType.startsWith("SPREADS_CARDS_")) {
    return "VOID";
  }

  // —— Jogadores (precisa lista informada no admin) ——————————————————————

  const scorers = context.goalScorers ?? [];
  const carded = context.cardedPlayers ?? [];
  const redCarded = context.redCardPlayers ?? [];

  if (marketType === "PLAYER_ANYTIME_SCORER") {
    if (context.goalScorers === undefined) return "VOID";
    return scorers.includes(selection) ? "WON" : "LOST";
  }

  if (marketType === "PLAYER_FIRST_SCORER") {
    if (context.firstScorer === undefined || context.firstScorer === null) return "VOID";
    return selection === context.firstScorer ? "WON" : "LOST";
  }

  if (marketType === "PLAYER_LAST_SCORER") {
    if (context.lastScorer === undefined || context.lastScorer === null) return "VOID";
    return selection === context.lastScorer ? "WON" : "LOST";
  }

  if (marketType === "PLAYER_TO_RECEIVE_CARD") {
    if (context.cardedPlayers === undefined && context.redCardPlayers === undefined) {
      return "VOID";
    }
    const all = [...carded, ...redCarded];
    return all.includes(selection) ? "WON" : "LOST";
  }

  if (marketType === "PLAYER_TO_RECEIVE_RED_CARD") {
    if (context.redCardPlayers === undefined) return "VOID";
    return redCarded.includes(selection) ? "WON" : "LOST";
  }

  // Chutes / assistências: sem estatística individual no formulário → VOID
  if (
    marketType.startsWith("PLAYER_SHOTS_") ||
    marketType.startsWith("PLAYER_SHOTS_ON_TARGET_") ||
    marketType.startsWith("PLAYER_ASSISTS_")
  ) {
    return "VOID";
  }

  return "VOID";
}

/** Normaliza nome digitado no admin para bater com `selection` da odd. */
export function normalizePlayerKey(name: string): string {
  return normalizeToken(name);
}
