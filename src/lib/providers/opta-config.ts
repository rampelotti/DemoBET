/**
 * Config da integração Opta / Stats Perform (feed público do Betting Showcase).
 * @see https://optaplayerstats.statsperform.com/en_GB/soccer
 */
export const OPTA_CONFIG = {
  baseUrl: "https://api.performfeeds.com",
  /**
   * Outlet usado pelos widgets públicos Opta Player Stats.
   * Pode sobrescrever com `OPTA_OUTLET_KEY` no ambiente.
   */
  outletKey: process.env.OPTA_OUTLET_KEY ?? "ft1tiv1inq7v1sk3y9tv12yh5",
  /** Calendário Copa do Mundo FIFA 2026. */
  tournamentCalendarId:
    process.env.OPTA_TOURNAMENT_CALENDAR_ID ?? "873cbl9cd9butm4air0mugxzo",
  cacheTtlMs: 5 * 60 * 1000,
  attributionUrl: "https://optaplayerstats.statsperform.com/en_GB/soccer",
} as const;
