// Formato "neutro" de dados de partidas, independente da fonte (mock hoje,
// API externa no futuro). Qualquer MatchProvider deve retornar este formato.

export interface OddDTO {
  selection: string;
  label: string;
  value: number;
}

export interface MarketDTO {
  type: string;
  label: string;
  odds: OddDTO[];
}

export interface MatchDTO {
  externalId: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeCrestUrl?: string;
  awayCrestUrl?: string;
  leagueLogoUrl?: string;
  startTime: Date;
  markets: MarketDTO[];
}

// Formato usado no lado do cliente: partida já persistida no banco, com
// mercados e odds carregados (retorno de `getUpcomingMatches`).
export interface MatchWithMarkets {
  id: string;
  slug: string | null;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  leagueLogoUrl: string | null;
  startTime: Date;
  markets: {
    id: string;
    type: string;
    label: string;
    odds: {
      id: string;
      selection: string;
      label: string;
      value: number;
      isActive: boolean;
    }[];
  }[];
}

export const SPORTS = {
  FOOTBALL: "futebol",
  BASKETBALL: "basquete",
  TENNIS: "tenis",
} as const;

export type SportSlug = (typeof SPORTS)[keyof typeof SPORTS];
