import { SPORTS, type MarketDTO, type MatchDTO, type OddDTO } from "@/features/betting/types";
import type { MatchProvider } from "@/lib/providers/match-provider";
import { slugify } from "@/lib/slug";

/**
 * Integração com a The Odds API (https://the-odds-api.com).
 *
 * Mantida deliberadamente enxuta em requisições:
 *  - 1 esporte (futebol / Copa do Mundo)
 *  - 1 partida específica (semifinal França x Espanha)
 *  - odds em cache (`next.revalidate`), sem polling manual
 *  - odds vêm sempre da Pinnacle (`PREFERRED_BOOKMAKER`), para manter uma
 *    fonte única e consistente em vez de misturar linhas de casas
 *    diferentes. Se a Pinnacle não cobrir a partida, cai para qualquer
 *    outra casa disponível (ver `pickMarketsFromBookmakers`).
 *
 * Duas chamadas por importação:
 *  1. `/odds` (mercados "featured": h2h + totals) — custo fixo, sempre 2
 *     créditos (2 mercados x 1 região).
 *  2. `/events/{id}/odds` (todos os mercados "additional" que a API tem
 *     para futebol: 1º tempo, escanteios, cartões, qualificação, placar
 *     exato, dupla chance, props de jogador etc.) — custo variável, só
 *     paga pelos mercados que a API de fato devolver (ver `ADDITIONAL_MARKETS`).
 *
 * Limitação conhecida: a liquidação automática (`settle-match-core.ts`) usa
 * só o placar final (`/scores`). Mercados que dependem de dados que essa
 * fonte não tem — 1º tempo, escanteios, cartões, artilheiro — não podem ser
 * resolvidos corretamente e caem no fallback seguro (VOID = aposta anulada
 * e valor devolvido) em `resolve-selection-result.ts`, em vez de resolver
 * errado. "Quem se classifica", "dupla chance" e "placar exato" já são
 * resolvidos de verdade, pois dependem só do placar final.
 *
 * Esse provider alimenta o fluxo real de partidas em
 * `matches-repository.ts` (Home só mostra partidas vindas daqui, por
 * decisão temporária do produto). `fetchOddsApiScores` é usado
 * separadamente para liquidar partidas automaticamente quando terminam.
 */

const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

// Chave de esporte da The Odds API para a Copa do Mundo FIFA.
const SPORT_KEY = "soccer_fifa_world_cup";

// Preferimos sempre a mesma casa de apostas, para não misturar linhas/vig
// de bookmakers diferentes na mesma partida.
const PREFERRED_BOOKMAKER = "pinnacle";

// Mercados "featured", buscados de uma vez para todos os jogos do esporte.
const FEATURED_MARKETS = ["h2h", "totals"] as const;

// Mercados "additional" (só via endpoint por evento). Pedimos tudo que é
// relevante para futebol; o que a Pinnacle não tiver para essa partida
// simplesmente não aparece na resposta (e não é cobrado da cota).
const ADDITIONAL_MARKETS = [
  // Partida (tempo normal)
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
  // 1º tempo
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
  // Escanteios
  "corners_1x2",
  "alternate_spreads_corners",
  "alternate_totals_corners",
  "alternate_team_totals_corners",
  // Cartões
  "alternate_spreads_cards",
  "alternate_totals_cards",
  // Props de jogador
  "player_goal_scorer_anytime",
  "player_first_goal_scorer",
  "player_last_goal_scorer",
  "player_to_receive_card",
  "player_to_receive_red_card",
  "player_shots_on_target",
  "player_shots",
  "player_assists",
] as const;

interface OddsApiOutcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
}

interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}

interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}

interface OddsApiEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiBookmaker[];
}

export interface OddsApiScoreEntry {
  name: string;
  score: string;
}

export interface OddsApiScoreEvent {
  id: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: OddsApiScoreEntry[] | null;
}

/**
 * Escolhe, para cada mercado desejado, a versão da Pinnacle. Se a Pinnacle
 * não cobrir a partida/região nesta consulta, cai para a primeira outra
 * bookmaker que tiver cada mercado — melhor odds "de outra casa" do que
 * mercado nenhum.
 */
function pickMarketsFromBookmakers(
  bookmakers: OddsApiBookmaker[],
  marketKeys: readonly string[]
): OddsApiMarket[] {
  const preferred = bookmakers.find((bookmaker) => bookmaker.key === PREFERRED_BOOKMAKER);

  const result: OddsApiMarket[] = [];
  for (const key of marketKeys) {
    const fromPreferred = preferred?.markets.find((market) => market.key === key);
    if (fromPreferred) {
      result.push(fromPreferred);
      continue;
    }
    if (preferred) continue; // Pinnacle cobre a partida, mas não esse mercado — não mistura com outra casa.

    const fromAnyBookmaker = bookmakers
      .map((bookmaker) => bookmaker.markets.find((market) => market.key === key))
      .find((market): market is OddsApiMarket => market !== undefined);
    if (fromAnyBookmaker) result.push(fromAnyBookmaker);
  }
  return result;
}

function isTargetMatch(event: OddsApiEvent): boolean {
  const teams = [event.home_team, event.away_team].map((team) => team.toLowerCase());
  return teams.includes("france") && teams.includes("spain");
}

function typeSafeName(value: string): string {
  return slugify(value).toUpperCase().replace(/-/g, "_");
}

/** h2h, h2h_h1, corners_1x2, to_qualify — vencedor entre os dois times (com ou sem empate). */
function mapWinnerMarket(
  market: OddsApiMarket,
  homeTeam: string,
  awayTeam: string,
  type: string,
  label: string,
  includeDraw: boolean
): MarketDTO | null {
  if (market.outcomes.length === 0) return null;

  const odds: OddDTO[] = [];
  for (const outcome of market.outcomes) {
    if (outcome.name === homeTeam) odds.push({ selection: "HOME", label: outcome.name, value: outcome.price });
    else if (outcome.name === awayTeam) odds.push({ selection: "AWAY", label: outcome.name, value: outcome.price });
    else if (includeDraw) odds.push({ selection: "DRAW", label: outcome.name, value: outcome.price });
  }
  if (odds.length === 0) return null;

  return { type, label, odds };
}

function mapBttsMarket(market: OddsApiMarket, type: string, label: string): MarketDTO | null {
  if (market.outcomes.length === 0) return null;

  const odds: OddDTO[] = market.outcomes.map((outcome) => ({
    selection: outcome.name.toUpperCase() === "YES" ? "YES" : "NO",
    label: outcome.name === "Yes" ? "Sim" : "Não",
    value: outcome.price,
  }));

  return { type, label, odds };
}

/** double_chance, double_chance_h1 — combinações "time ou empate" a partir do placar final. */
function mapDoubleChanceMarket(
  market: OddsApiMarket,
  homeTeam: string,
  awayTeam: string,
  type: string,
  label: string
): MarketDTO | null {
  if (market.outcomes.length === 0) return null;

  const odds: OddDTO[] = [];
  for (const outcome of market.outcomes) {
    const text = outcome.name.toLowerCase();
    const hasHome = text.includes(homeTeam.toLowerCase());
    const hasAway = text.includes(awayTeam.toLowerCase());
    const hasDraw = text.includes("draw") || text.includes("empate");

    let selection: string | null = null;
    if (hasHome && hasAway) selection = "HOME_OR_AWAY";
    else if (hasHome && hasDraw) selection = "HOME_OR_DRAW";
    else if (hasAway && hasDraw) selection = "DRAW_OR_AWAY";

    if (selection) odds.push({ selection, label: outcome.name, value: outcome.price });
  }
  if (odds.length === 0) return null;

  return { type, label, odds };
}

/** correct_score, correct_score_h1 — placar exato; totalmente verificável contra o placar final. */
function mapCorrectScoreMarket(market: OddsApiMarket, type: string, label: string): MarketDTO | null {
  if (market.outcomes.length === 0) return null;

  const odds: OddDTO[] = market.outcomes.map((outcome) => ({
    selection: outcome.name.replace(/\s*:\s*|\s*-\s*/g, "-"),
    label: outcome.name,
    value: outcome.price,
  }));

  return { type, label, odds };
}

/** halftime_fulltime — combinação HT/FT; sem dado de intervalo, cai em VOID na liquidação. */
function mapPassthroughMarket(market: OddsApiMarket, type: string, label: string): MarketDTO | null {
  if (market.outcomes.length === 0) return null;

  const odds: OddDTO[] = market.outcomes.map((outcome) => ({
    selection: typeSafeName(outcome.name),
    label: outcome.name,
    value: outcome.price,
  }));

  return { type, label, odds };
}

/**
 * Artilheiro/cartão por jogador — cada outcome tem `name: "Yes"` fixo e o
 * nome do jogador em `description` (mesmo padrão de `player_shots` etc.).
 */
function mapNamedEntityMarket(market: OddsApiMarket, type: string, label: string): MarketDTO | null {
  const odds: OddDTO[] = market.outcomes
    .filter((outcome) => outcome.description)
    .map((outcome) => ({
      selection: typeSafeName(outcome.description as string),
      label: outcome.description as string,
      value: outcome.price,
    }));

  if (odds.length === 0) return null;
  return { type, label, odds };
}

/** totals, alternate_totals, corners/cards totais, totals_h1 — agrupa por linha (`point`). */
function mapLineMarkets(market: OddsApiMarket, typePrefix: string, labelPrefix: string): MarketDTO[] {
  const byLine = new Map<number, { over?: OddsApiOutcome; under?: OddsApiOutcome }>();

  for (const outcome of market.outcomes) {
    if (outcome.point === undefined) continue;
    const entry = byLine.get(outcome.point) ?? {};
    if (outcome.name === "Over") entry.over = outcome;
    if (outcome.name === "Under") entry.under = outcome;
    byLine.set(outcome.point, entry);
  }

  const markets: MarketDTO[] = [];
  for (const [line, { over, under }] of byLine) {
    if (!over || !under) continue;
    markets.push({
      type: `${typePrefix}${line}`,
      label: `${labelPrefix} - Mais/Menos de ${line}`,
      odds: [
        { selection: "OVER", label: `Mais de ${line}`, value: over.price },
        { selection: "UNDER", label: `Menos de ${line}`, value: under.price },
      ],
    });
  }

  return markets;
}

/** team_totals[_h1], corners por time — agrupa por (time, linha), time identificado via `description`. */
function mapTeamLineMarkets(
  market: OddsApiMarket,
  homeTeam: string,
  awayTeam: string,
  typePrefix: string,
  labelPrefix: string
): MarketDTO[] {
  const byTeamAndLine = new Map<string, { over?: OddsApiOutcome; under?: OddsApiOutcome }>();

  for (const outcome of market.outcomes) {
    if (outcome.point === undefined || !outcome.description) continue;
    const key = `${outcome.description}|${outcome.point}`;
    const entry = byTeamAndLine.get(key) ?? {};
    if (outcome.name === "Over") entry.over = outcome;
    if (outcome.name === "Under") entry.under = outcome;
    byTeamAndLine.set(key, entry);
  }

  const markets: MarketDTO[] = [];
  for (const [key, { over, under }] of byTeamAndLine) {
    if (!over || !under) continue;
    const [team, lineStr] = key.split("|");
    const line = Number(lineStr);
    const isHome = team === homeTeam;
    const isAway = team === awayTeam;
    if (!isHome && !isAway) continue;

    markets.push({
      type: `${typePrefix}${isHome ? "HOME" : "AWAY"}_${line}`,
      label: `${labelPrefix} - ${team} - Mais/Menos de ${line}`,
      odds: [
        { selection: "OVER", label: `Mais de ${line}`, value: over.price },
        { selection: "UNDER", label: `Menos de ${line}`, value: under.price },
      ],
    });
  }

  return markets;
}

/** player_shots, player_shots_on_target, player_assists — agrupa por (jogador, linha). */
function mapPlayerLineMarkets(market: OddsApiMarket, typePrefix: string, labelPrefix: string): MarketDTO[] {
  const byPlayerAndLine = new Map<string, { over?: OddsApiOutcome; under?: OddsApiOutcome }>();

  for (const outcome of market.outcomes) {
    if (outcome.point === undefined || !outcome.description) continue;
    const key = `${outcome.description}|${outcome.point}`;
    const entry = byPlayerAndLine.get(key) ?? {};
    if (outcome.name === "Over") entry.over = outcome;
    if (outcome.name === "Under") entry.under = outcome;
    byPlayerAndLine.set(key, entry);
  }

  const markets: MarketDTO[] = [];
  for (const [key, { over, under }] of byPlayerAndLine) {
    if (!over || !under) continue;
    const [player, lineStr] = key.split("|");
    const line = Number(lineStr);

    markets.push({
      type: `${typePrefix}${typeSafeName(player)}_${line}`,
      label: `${labelPrefix} - ${player} - Mais/Menos de ${line}`,
      odds: [
        { selection: "OVER", label: `Mais de ${line}`, value: over.price },
        { selection: "UNDER", label: `Menos de ${line}`, value: under.price },
      ],
    });
  }

  return markets;
}

function mapMarket(market: OddsApiMarket, homeTeam: string, awayTeam: string): MarketDTO[] {
  switch (market.key) {
    case "h2h":
      return single(mapWinnerMarket(market, homeTeam, awayTeam, "MATCH_WINNER", "Resultado final", true));
    case "h2h_h1":
      return single(
        mapWinnerMarket(market, homeTeam, awayTeam, "MATCH_WINNER_H1", "Resultado do 1º tempo", true)
      );
    case "corners_1x2":
      return single(
        mapWinnerMarket(market, homeTeam, awayTeam, "CORNERS_WINNER", "Mais escanteios", true)
      );
    case "to_qualify":
      return single(mapWinnerMarket(market, homeTeam, awayTeam, "TO_QUALIFY", "Quem se classifica", false));

    case "btts":
      return single(mapBttsMarket(market, "BOTH_TEAMS_SCORE", "Ambas as equipes marcam"));
    case "btts_h1":
      return single(mapBttsMarket(market, "BOTH_TEAMS_SCORE_H1", "Ambas marcam no 1º tempo"));

    case "draw_no_bet":
      return single(mapWinnerMarket(market, homeTeam, awayTeam, "DRAW_NO_BET", "Empate anula a aposta", false));

    case "double_chance":
      return single(mapDoubleChanceMarket(market, homeTeam, awayTeam, "DOUBLE_CHANCE", "Dupla chance"));
    case "double_chance_h1":
      return single(
        mapDoubleChanceMarket(market, homeTeam, awayTeam, "DOUBLE_CHANCE_H1", "Dupla chance - 1º tempo")
      );

    case "correct_score":
      return single(mapCorrectScoreMarket(market, "CORRECT_SCORE", "Placar exato"));
    case "correct_score_h1":
      return single(mapCorrectScoreMarket(market, "CORRECT_SCORE_H1", "Placar exato - 1º tempo"));

    case "halftime_fulltime":
      return single(mapPassthroughMarket(market, "HALFTIME_FULLTIME", "Intervalo/Final"));

    case "totals":
    case "alternate_totals":
      return mapLineMarkets(market, "OVER_UNDER_", "Total de gols");
    case "totals_h1":
    case "alternate_totals_h1":
      return mapLineMarkets(market, "OVER_UNDER_H1_", "Total de gols - 1º tempo");
    case "alternate_totals_corners":
      return mapLineMarkets(market, "CORNERS_OVER_UNDER_", "Total de escanteios");
    case "alternate_totals_cards":
      return mapLineMarkets(market, "CARDS_OVER_UNDER_", "Total de cartões");

    case "team_totals":
    case "alternate_team_totals":
      return mapTeamLineMarkets(market, homeTeam, awayTeam, "TEAM_TOTAL_", "Total de gols");
    case "team_totals_h1":
    case "alternate_team_totals_h1":
      return mapTeamLineMarkets(market, homeTeam, awayTeam, "TEAM_TOTAL_H1_", "Total de gols - 1º tempo");
    case "alternate_team_totals_corners":
      return mapTeamLineMarkets(market, homeTeam, awayTeam, "CORNERS_TEAM_TOTAL_", "Total de escanteios");

    case "player_goal_scorer_anytime":
      return single(mapNamedEntityMarket(market, "PLAYER_ANYTIME_SCORER", "Marca a qualquer momento"));
    case "player_first_goal_scorer":
      return single(mapNamedEntityMarket(market, "PLAYER_FIRST_SCORER", "Primeiro a marcar"));
    case "player_last_goal_scorer":
      return single(mapNamedEntityMarket(market, "PLAYER_LAST_SCORER", "Último a marcar"));
    case "player_to_receive_card":
      return single(mapNamedEntityMarket(market, "PLAYER_TO_RECEIVE_CARD", "Recebe cartão"));
    case "player_to_receive_red_card":
      return single(mapNamedEntityMarket(market, "PLAYER_TO_RECEIVE_RED_CARD", "Recebe cartão vermelho"));

    case "player_shots":
      return mapPlayerLineMarkets(market, "PLAYER_SHOTS_", "Chutes do jogador");
    case "player_shots_on_target":
      return mapPlayerLineMarkets(market, "PLAYER_SHOTS_ON_TARGET_", "Chutes no gol do jogador");
    case "player_assists":
      return mapPlayerLineMarkets(market, "PLAYER_ASSISTS_", "Assistências do jogador");

    default:
      // "spreads"/"alternate_spreads" (handicap asiático, tempo normal e 1º
      // tempo) ainda não têm mapeamento — a lógica de meio-gol/push exigiria
      // liquidação própria que não implementamos ainda.
      return [];
  }
}

function single(market: MarketDTO | null): MarketDTO[] {
  return market ? [market] : [];
}

function buildMatch(event: OddsApiEvent, combinedMarkets: OddsApiMarket[]): MatchDTO | null {
  const markets = combinedMarkets.flatMap((market) => mapMarket(market, event.home_team, event.away_team));

  // Evita duplicar o mesmo `type` (ex.: se aparecer em mais de uma chamada).
  const seen = new Set<string>();
  const dedupedMarkets = markets.filter((market) => {
    if (seen.has(market.type)) return false;
    seen.add(market.type);
    return true;
  });

  if (dedupedMarkets.length === 0) return null;

  return {
    externalId: `odds-api-${event.id}`,
    sport: SPORTS.FOOTBALL,
    league: "Copa do Mundo FIFA",
    homeTeam: event.home_team,
    awayTeam: event.away_team,
    startTime: new Date(event.commence_time),
    markets: dedupedMarkets,
  };
}

function requireApiKey(): string {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ODDS_API_KEY não configurada. Defina essa variável no .env com uma chave da the-odds-api.com."
    );
  }
  return apiKey;
}

/**
 * A The Odds API devolve o consumo de cota em headers em toda resposta
 * (mesmo em erro). Só logamos — não é uma chamada extra, é a mesma
 * request que o app já ia fazer.
 */
function logQuotaUsage(response: Response, label: string): void {
  const used = response.headers.get("x-requests-used");
  const remaining = response.headers.get("x-requests-remaining");
  const last = response.headers.get("x-requests-last");
  if (used === null && remaining === null) return;

  console.log(
    `[the-odds-api] ${label} — usadas: ${used ?? "?"} | restantes: ${remaining ?? "?"} | custo desta chamada: ${last ?? "?"}`
  );
}

/**
 * Busca os mercados "additional" (não-featured) de uma partida específica.
 * Só vale a pena chamar depois de já ter o `eventId` (via `/odds`), porque
 * esse endpoint trabalha 1 evento por vez.
 */
async function fetchAdditionalMarkets(eventId: string): Promise<OddsApiMarket[]> {
  const apiKey = requireApiKey();

  const params = new URLSearchParams({
    apiKey,
    regions: "eu",
    markets: ADDITIONAL_MARKETS.join(","),
    oddsFormat: "decimal",
  });

  const response = await fetch(
    `${ODDS_API_BASE_URL}/sports/${SPORT_KEY}/events/${eventId}/odds?${params.toString()}`,
    { next: { revalidate: 3600 } }
  );

  logQuotaUsage(response, "listUpcomingMatches (/events/{id}/odds — mercados adicionais)");

  if (!response.ok) return [];

  const event = (await response.json()) as OddsApiEvent;
  return pickMarketsFromBookmakers(event.bookmakers ?? [], ADDITIONAL_MARKETS);
}

class OddsApiProvider implements MatchProvider {
  readonly id = "the-odds-api";
  readonly externalIdPrefix = "odds-api-";

  async listUpcomingMatches(): Promise<MatchDTO[]> {
    const apiKey = requireApiKey();

    const params = new URLSearchParams({
      apiKey,
      regions: "eu",
      markets: FEATURED_MARKETS.join(","),
      oddsFormat: "decimal",
    });

    const response = await fetch(`${ODDS_API_BASE_URL}/sports/${SPORT_KEY}/odds?${params.toString()}`, {
      // Cache de 1h evita repetir a chamada em recarregamentos seguidos
      // (sem polling/auto-refresh).
      next: { revalidate: 3600 },
    });

    logQuotaUsage(response, "listUpcomingMatches (/odds — mercados featured)");

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`The Odds API retornou ${response.status}: ${body}`);
    }

    const events = (await response.json()) as OddsApiEvent[];
    const targetEvent = events.find(isTargetMatch);
    if (!targetEvent) return [];

    const featuredMarkets = pickMarketsFromBookmakers(targetEvent.bookmakers, FEATURED_MARKETS);

    const additionalMarkets = await fetchAdditionalMarkets(targetEvent.id).catch(() => []);

    const match = buildMatch(targetEvent, [...featuredMarkets, ...additionalMarkets]);
    return match ? [match] : [];
  }
}

/**
 * Busca placares recentes/atuais na The Odds API, usados para liquidar
 * partidas automaticamente (ver `settleFinishedOddsApiMatches` em
 * `matches-repository.ts`). Cache curto (5min) para permitir detectar o
 * fim da partida sem fazer polling manual.
 */
export async function fetchOddsApiScores(): Promise<OddsApiScoreEvent[]> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({ apiKey, daysFrom: "3" });

  const response = await fetch(`${ODDS_API_BASE_URL}/sports/${SPORT_KEY}/scores?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  logQuotaUsage(response, "fetchOddsApiScores (/scores)");

  if (!response.ok) return [];

  return (await response.json()) as OddsApiScoreEvent[];
}

export const oddsApiProvider: MatchProvider = new OddsApiProvider();
