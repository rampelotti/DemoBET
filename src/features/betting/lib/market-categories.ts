/**
 * Agrupa os `type` de mercado em categorias exibidas como abas na página da
 * partida (`match-markets-tabs.tsx`). Com dezenas de mercados por partida,
 * listar tudo em uma única grade ficaria ilegível.
 */
export type MarketCategory =
  | "principais"
  | "gols"
  | "primeiro-tempo"
  | "escanteios"
  | "cartoes"
  | "jogadores";

export const CATEGORY_ORDER: MarketCategory[] = [
  "principais",
  "gols",
  "primeiro-tempo",
  "escanteios",
  "cartoes",
  "jogadores",
];

export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  principais: "Partida",
  gols: "Gols",
  "primeiro-tempo": "1º Tempo",
  escanteios: "Escanteios",
  cartoes: "Cartões",
  jogadores: "Jogadores",
};

export function categorizeMarketType(type: string): MarketCategory {
  if (type.startsWith("PLAYER_")) return "jogadores";
  if (type.startsWith("CORNERS_") || type.startsWith("SPREADS_CORNERS")) return "escanteios";
  if (type.startsWith("CARDS_") || type.startsWith("SPREADS_CARDS")) return "cartoes";
  if (type.includes("_H1") || type.startsWith("SPREADS_H1")) return "primeiro-tempo";
  if (
    type.startsWith("OVER_UNDER_") ||
    type.startsWith("TEAM_TOTAL_") ||
    type === "BOTH_TEAMS_SCORE" ||
    type.startsWith("CORRECT_SCORE")
  ) {
    return "gols";
  }
  return "principais";
}
