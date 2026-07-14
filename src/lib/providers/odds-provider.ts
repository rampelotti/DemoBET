import type { MatchDTO } from "@/features/betting/types";

/**
 * Placar de partida encerrada — usado pela liquidação automática quando o
 * provider ativo suporta `fetchFinishedScores` (ex.: The Odds API).
 */
export interface FinishedMatchScore {
  externalId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  completed: boolean;
}

/**
 * Contrato único de fonte de odds/partidas. Toda a aplicação (Home, import,
 * liquidação) consome apenas esta interface — para trocar de mock para The
 * Odds API basta alterar `ODDS_PROVIDER` no `.env` (ver
 * `get-active-odds-provider.ts`).
 */
export interface OddsProvider {
  readonly id: string;
  readonly externalIdPrefix: string;
  listUpcomingMatches(): Promise<MatchDTO[]>;
  fetchFinishedScores?(): Promise<FinishedMatchScore[]>;
}

/** @deprecated Use `OddsProvider` — alias mantido para compatibilidade interna. */
export type MatchProvider = OddsProvider;
