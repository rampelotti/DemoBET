/**
 * Resolve o resultado de uma seleção de aposta a partir do placar final e do
 * tipo de mercado/seleção. Funciona de forma genérica para qualquer partida
 * (mock hoje, API real no futuro), desde que o provider siga as mesmas
 * convenções de `type`/`selection`:
 *  - "MATCH_WINNER" com seleções HOME / DRAW / AWAY (ou só HOME / AWAY)
 *  - "DRAW_NO_BET" / "TO_QUALIFY" com seleções HOME / AWAY (empate anula)
 *  - "DOUBLE_CHANCE" com seleções HOME_OR_DRAW / HOME_OR_AWAY / DRAW_OR_AWAY
 *  - "CORRECT_SCORE" com seleção no formato "<gols casa>-<gols visitante>"
 *  - "OVER_UNDER_<linha>" com seleções OVER / UNDER (total da partida)
 *  - "TEAM_TOTAL_HOME_<linha>" / "TEAM_TOTAL_AWAY_<linha>" com seleções
 *    OVER / UNDER (total de gols só do time da casa/visitante)
 *  - "BOTH_TEAMS_SCORE" com seleções YES / NO
 *
 * Mercados que dependem de dados que a fonte de placares não tem (1º tempo,
 * escanteios, cartões, artilheiro etc. — ver `odds-api-provider.ts`) caem no
 * fallback VOID abaixo: a aposta é anulada e o valor devolvido, em vez de
 * resolvida errado.
 */
export function resolveSelectionResult(
  marketType: string,
  selection: string,
  homeScore: number,
  awayScore: number
): "WON" | "LOST" | "VOID" {
  if (marketType === "MATCH_WINNER") {
    const outcome = homeScore === awayScore ? "DRAW" : homeScore > awayScore ? "HOME" : "AWAY";
    return selection === outcome ? "WON" : "LOST";
  }

  if (marketType === "DRAW_NO_BET" || marketType === "TO_QUALIFY") {
    if (homeScore === awayScore) return "VOID";
    const outcome = homeScore > awayScore ? "HOME" : "AWAY";
    return selection === outcome ? "WON" : "LOST";
  }

  if (marketType === "DOUBLE_CHANCE") {
    const isDraw = homeScore === awayScore;
    const homeWon = homeScore > awayScore;
    const awayWon = awayScore > homeScore;

    if (selection === "HOME_OR_DRAW") return homeWon || isDraw ? "WON" : "LOST";
    if (selection === "HOME_OR_AWAY") return !isDraw ? "WON" : "LOST";
    if (selection === "DRAW_OR_AWAY") return awayWon || isDraw ? "WON" : "LOST";
    return "VOID";
  }

  if (marketType === "CORRECT_SCORE") {
    const outcome = `${homeScore}-${awayScore}`;
    return selection === outcome ? "WON" : "LOST";
  }

  if (marketType.startsWith("OVER_UNDER_")) {
    const line = Number(marketType.replace("OVER_UNDER_", ""));
    if (Number.isNaN(line)) return "VOID";

    const total = homeScore + awayScore;
    if (total === line) return "VOID";

    const outcome = total > line ? "OVER" : "UNDER";
    return selection === outcome ? "WON" : "LOST";
  }

  if (marketType.startsWith("TEAM_TOTAL_HOME_") || marketType.startsWith("TEAM_TOTAL_AWAY_")) {
    const isHome = marketType.startsWith("TEAM_TOTAL_HOME_");
    const line = Number(marketType.replace(isHome ? "TEAM_TOTAL_HOME_" : "TEAM_TOTAL_AWAY_", ""));
    if (Number.isNaN(line)) return "VOID";

    const teamScore = isHome ? homeScore : awayScore;
    if (teamScore === line) return "VOID";

    const outcome = teamScore > line ? "OVER" : "UNDER";
    return selection === outcome ? "WON" : "LOST";
  }

  if (marketType === "BOTH_TEAMS_SCORE") {
    const outcome = homeScore > 0 && awayScore > 0 ? "YES" : "NO";
    return selection === outcome ? "WON" : "LOST";
  }

  return "VOID";
}
