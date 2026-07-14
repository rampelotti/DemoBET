import type { FinishedMatchScore, OddsProvider } from "@/lib/providers/odds-provider";
import { fetchOddsApiScores, oddsApiProvider } from "@/lib/providers/odds-api-provider";

const PREFIX = "odds-api-";

/**
 * Adaptador da integração existente com The Odds API (`odds-api-provider.ts`).
 * Não altera a implementação original — apenas a expõe via `OddsProvider`.
 */
class TheOddsProvider implements OddsProvider {
  readonly id = "the-odds-api";
  readonly externalIdPrefix = PREFIX;

  listUpcomingMatches() {
    return oddsApiProvider.listUpcomingMatches();
  }

  async fetchFinishedScores(): Promise<FinishedMatchScore[]> {
    const scores = await fetchOddsApiScores();
    return scores
      .filter((event) => event.completed && event.scores)
      .map((event) => {
        const homeEntry = event.scores!.find((entry) => entry.name === event.home_team);
        const awayEntry = event.scores!.find((entry) => entry.name === event.away_team);
        if (!homeEntry || !awayEntry) return null;

        const homeScore = Number(homeEntry.score);
        const awayScore = Number(awayEntry.score);
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;

        return {
          externalId: `${PREFIX}${event.id}`,
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          homeScore,
          awayScore,
          completed: true,
        };
      })
      .filter((entry): entry is FinishedMatchScore => entry !== null);
  }
}

export const theOddsProvider: OddsProvider = new TheOddsProvider();
