/**
 * Configuração do MVP com The Odds API.
 * Trocar times/esporte/casa aqui no futuro — o provider lê só desta config.
 */
export const ODDS_API_MVP_CONFIG = {
  /** Chave de esporte na The Odds API. */
  sportKey: "soccer_fifa_world_cup",
  leagueLabel: "Copa do Mundo FIFA",
  /** Bookmaker exclusivo neste MVP. */
  bookmaker: "pinnacle",
  /** Região usada na consulta (impacta custo: mercados × regiões). */
  region: "eu",
  /**
   * Partida alvo. Matching case-insensitive nos nomes retornados pela API
   * (`France`, `Spain`, etc.).
   */
  targetTeams: {
    a: "france",
    b: "spain",
  },
  /**
   * TTL do cache compartilhado (ms).
   * MVP só pré-live: 2h prioriza mínimo consumo de cota sobre frescor das odds.
   * O Postgres (`matches.updatedAt`) é a fonte compartilhada entre usuários
   * no Vercel; o cache em memória do processo é só um atalho extra.
   */
  cacheTtlMs: 2 * 60 * 60 * 1000,
  /**
   * Mercados pedidos no endpoint por evento. A API só devolve (e só cobra)
   * o que a Pinnacle cobrir; o restante é ignorado sem custo extra desnecessário
   * além dos mercados presentes na resposta.
   */
  markets: [
    "h2h",
    "totals",
    "btts",
    "draw_no_bet",
    "team_totals",
    "alternate_totals",
    "alternate_team_totals",
    "spreads",
    "alternate_spreads",
    "double_chance",
    "correct_score",
    "halftime_fulltime",
    "to_qualify",
    "h2h_h1",
    "spreads_h1",
    "alternate_spreads_h1",
    "totals_h1",
    "alternate_totals_h1",
    "team_totals_h1",
    "alternate_team_totals_h1",
    "btts_h1",
    "correct_score_h1",
    "double_chance_h1",
    "corners_1x2",
    "alternate_spreads_corners",
    "alternate_totals_corners",
    "alternate_team_totals_corners",
    "alternate_spreads_cards",
    "alternate_totals_cards",
    "player_goal_scorer_anytime",
    "player_first_goal_scorer",
    "player_last_goal_scorer",
    "player_to_receive_card",
    "player_to_receive_red_card",
    "player_shots_on_target",
    "player_shots",
    "player_assists",
  ],
} as const;

export type OddsApiMvpConfig = typeof ODDS_API_MVP_CONFIG;
