import { SPORTS, type MarketDTO, type MatchDTO, type OddDTO } from "@/features/betting/types";
import { ODDS_API_MVP_CONFIG } from "@/lib/providers/odds-api-mvp-config";
import type { MatchProvider } from "@/lib/providers/match-provider";
import { slugify } from "@/lib/slug";

/**
 * Integração com a The Odds API (https://the-odds-api.com) — MVP.
 *
 * Regras deste MVP:
 *  - 1 partida: França x Espanha (ver `odds-api-mvp-config.ts`)
 *  - 1 bookmaker: Pinnacle apenas (sem fallback para outras casas)
 *  - Backend-only: o frontend nunca chama esta API
 *  - Cache em memória (por processo) + Postgres (`matches.updatedAt`) como
 *    cache compartilhado entre todos os usuários no Vercel
 *  - Após o `commence_time`, não há refresh de odds
 *  - Sem websocket / polling
 *
 * Chamadas por refresh (quando o TTL do DB/expira e o jogo ainda não começou):
 *  1. `GET /events` — lista eventos sem odds (não consome cota) → achar o jogo
 *  2. `GET /events/{id}/odds` — todos os mercados pedidos + bookmakers=pinnacle
 *
 * Liquidação (`/scores`) continua separada e só roda quando a partida já
 * deveria ter acabado (ver `matches-repository.ts`).
 */

const ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";
const SPORT_KEY = ODDS_API_MVP_CONFIG.sportKey;
const PREFERRED_BOOKMAKER = ODDS_API_MVP_CONFIG.bookmaker;
const CACHE_TTL_MS = ODDS_API_MVP_CONFIG.cacheTtlMs;
const CACHE_TTL_SECONDS = Math.ceil(CACHE_TTL_MS / 1000);
const ALL_MARKETS = ODDS_API_MVP_CONFIG.markets;

interface OddsListCache {
  matches: MatchDTO[];
  fetchedAt: number;
  commenceTimeMs: number | null;
}

/** Cache compartilhado entre requests no mesmo processo Node (warmup). */
let listCache: OddsListCache | null = null;
/** Evita fan-out de requisições paralelas no mesmo cold start. */
let listInFlight: Promise<MatchDTO[]> | null = null;
/** Bust do Data Cache do Next após correção do pareamento de handicaps. */
const ODDS_FETCH_CACHE_BUST = "spreadPairV3";
/**
 * Permite uma busca paga mesmo após o kickoff (reparo de pares inventados
 * no Postgres). Consome o flag ao usar.
 */
let allowPostKickoffOddsFetch = false;

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
 * Usa exclusivamente mercados da Pinnacle. Se a Pinnacle não cobrir um
 * mercado, ele simplesmente não entra — sem misturar outras casas.
 */
function pickPinnacleMarkets(bookmakers: OddsApiBookmaker[]): OddsApiMarket[] {
  const preferred = bookmakers.find((bookmaker) => bookmaker.key === PREFERRED_BOOKMAKER);
  return preferred?.markets ?? [];
}

function isTargetMatch(event: { home_team: string; away_team: string }): boolean {
  const teams = [event.home_team, event.away_team].map((team) => team.toLowerCase());
  return teams.includes(ODDS_API_MVP_CONFIG.targetTeams.a) && teams.includes(ODDS_API_MVP_CONFIG.targetTeams.b);
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
    if (!over && !under) continue;
    const odds: OddDTO[] = [];
    if (over) odds.push({ selection: "OVER", label: `Mais de ${line}`, value: over.price });
    if (under) odds.push({ selection: "UNDER", label: `Menos de ${line}`, value: under.price });
    markets.push({
      type: `${typePrefix}${line}`,
      label: `${labelPrefix} - Mais/Menos de ${line}`,
      odds,
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
    if (!over && !under) continue;
    const [team, lineStr] = key.split("|");
    const line = Number(lineStr);
    const isHome = team === homeTeam;
    const isAway = team === awayTeam;
    if (!isHome && !isAway) continue;

    const odds: OddDTO[] = [];
    if (over) odds.push({ selection: "OVER", label: `Mais de ${line}`, value: over.price });
    if (under) odds.push({ selection: "UNDER", label: `Menos de ${line}`, value: under.price });

    markets.push({
      type: `${typePrefix}${isHome ? "HOME" : "AWAY"}_${line}`,
      label: `${labelPrefix} - ${team} - Mais/Menos de ${line}`,
      odds,
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
    if (!over && !under) continue;
    const [player, lineStr] = key.split("|");
    const line = Number(lineStr);

    const odds: OddDTO[] = [];
    if (over) odds.push({ selection: "OVER", label: `Mais de ${line}`, value: over.price });
    if (under) odds.push({ selection: "UNDER", label: `Menos de ${line}`, value: under.price });

    markets.push({
      type: `${typePrefix}${typeSafeName(player)}_${line}`,
      label: `${labelPrefix} - ${player} - Mais/Menos de ${line}`,
      odds,
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

    case "spreads":
    case "alternate_spreads":
    case "spreads_h1":
    case "alternate_spreads_h1":
    case "alternate_spreads_corners":
    case "alternate_spreads_cards":
      return mapSpreadMarkets(market, homeTeam, awayTeam, market.key);

    default:
      // Exibe qualquer mercado ainda não tipado exatamente como a API mandou.
      return single(
        mapPassthroughMarket(
          market,
          typeSafeName(market.key),
          market.key.replace(/_/g, " ")
        )
      );
  }
}

/**
 * Família de handicap para agrupamento na UI (um bloco expansível por família).
 * Labels no formato "<família> - <linha>" — ver `HANDICAP_LABEL_PATTERN`.
 */
function handicapFamilyLabel(marketKey: string): string {
  switch (marketKey) {
    case "spreads_h1":
    case "alternate_spreads_h1":
      return "Handicap - 1º tempo";
    case "alternate_spreads_corners":
      return "Handicap de escanteios";
    case "alternate_spreads_cards":
      return "Handicap de cartões";
    default:
      return "Handicap";
  }
}

/** Prefixo estável de `type` para dedupe entre `spreads` e `alternate_spreads`. */
function spreadTypePrefix(marketKey: string): string {
  switch (marketKey) {
    case "spreads_h1":
    case "alternate_spreads_h1":
      return "SPREADS_H1";
    case "alternate_spreads_corners":
      return "SPREADS_CORNERS";
    case "alternate_spreads_cards":
      return "SPREADS_CARDS";
    default:
      return "SPREADS";
  }
}

/**
 * Handicap / spreads — um mercado por linha do mandante, só se existir o
 * par complementar (casa +X com visitante −X). A Odds API (alternate_spreads)
 * devolve todos os pontos de cada time misturados; agrupar só por `point`
 * inventa cruzamentos (ex.: França +1 com preço errado).
 */
function mapSpreadMarkets(
  market: OddsApiMarket,
  homeTeam: string,
  awayTeam: string,
  marketKey: string
): MarketDTO[] {
  const homeOutcomes = market.outcomes.filter(
    (outcome) => outcome.name === homeTeam && outcome.point !== undefined
  );
  const awayOutcomes = market.outcomes.filter(
    (outcome) => outcome.name === awayTeam && outcome.point !== undefined
  );

  const prefix = spreadTypePrefix(marketKey);
  const family = handicapFamilyLabel(marketKey);
  const markets: MarketDTO[] = [];
  const seenHomeLines = new Set<number>();

  for (const homeOutcome of homeOutcomes) {
    const homePoint = homeOutcome.point!;
    if (seenHomeLines.has(homePoint)) continue;

    const awayOutcome = awayOutcomes.find(
      (outcome) => Math.abs((outcome.point ?? NaN) + homePoint) < 1e-9
    );
    if (!awayOutcome) continue;

    seenHomeLines.add(homePoint);
    const awayPoint = awayOutcome.point!;
    const sign = homePoint > 0 ? `+${homePoint}` : `${homePoint}`;

    markets.push({
      type: `${prefix}_${homePoint}`,
      label: `${family} - ${sign}`,
      odds: [
        {
          selection: `HOME_${homePoint}`,
          label: `${homeTeam} (${homePoint > 0 ? `+${homePoint}` : homePoint})`,
          value: homeOutcome.price,
        },
        {
          selection: `AWAY_${awayPoint}`,
          label: `${awayTeam} (${awayPoint > 0 ? `+${awayPoint}` : awayPoint})`,
          value: awayOutcome.price,
        },
      ],
    });
  }

  return markets;
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
    league: ODDS_API_MVP_CONFIG.leagueLabel,
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

function shouldServeFromCache(cache: OddsListCache): boolean {
  const now = Date.now();
  const matchStarted = cache.commenceTimeMs !== null && now >= cache.commenceTimeMs;
  if (matchStarted) {
    // Pós-início: mantém o último snapshot, sem gastar cota.
    return true;
  }
  return now - cache.fetchedAt < CACHE_TTL_MS;
}

interface OddsApiEventSummary {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

/**
 * Lista eventos do esporte sem odds — endpoint que não consome cota.
 * Usado só para achar o ID + horário de França x Espanha.
 */
async function findTargetEventSummary(): Promise<OddsApiEventSummary | null> {
  const apiKey = requireApiKey();
  // Force-cache + revalidate: no Vercel, o Data Cache do Next evita
  // bater de novo na The Odds API entre instâncias dentro do TTL.
  const response = await fetch(
    `${ODDS_API_BASE_URL}/sports/${SPORT_KEY}/events?apiKey=${apiKey}&_ds=${ODDS_FETCH_CACHE_BUST}`,
    {
      cache: "force-cache",
      next: { revalidate: CACHE_TTL_SECONDS },
    }
  );

  logQuotaUsage(response, "findTargetEventSummary (/events — sem odds)");

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`The Odds API /events retornou ${response.status}: ${body}`);
  }

  const events = (await response.json()) as OddsApiEventSummary[];
  return events.find(isTargetMatch) ?? null;
}

/**
 * Uma única chamada paga: todos os mercados pedidos + só Pinnacle.
 */
async function fetchTargetEventOdds(eventId: string): Promise<OddsApiEvent | null> {
  const apiKey = requireApiKey();

  const params = new URLSearchParams({
    apiKey,
    regions: ODDS_API_MVP_CONFIG.region,
    markets: ALL_MARKETS.join(","),
    bookmakers: PREFERRED_BOOKMAKER,
    oddsFormat: "decimal",
    _ds: ODDS_FETCH_CACHE_BUST,
  });

  const response = await fetch(
    `${ODDS_API_BASE_URL}/sports/${SPORT_KEY}/events/${eventId}/odds?${params.toString()}`,
    {
      cache: "force-cache",
      next: { revalidate: CACHE_TTL_SECONDS },
    }
  );

  logQuotaUsage(response, "fetchTargetEventOdds (/events/{id}/odds — pinnacle)");

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`The Odds API /events/${eventId}/odds retornou ${response.status}: ${body}`);
  }

  return (await response.json()) as OddsApiEvent;
}

async function fetchMatchesFromApi(): Promise<MatchDTO[]> {
  const summary = await findTargetEventSummary();
  if (!summary) {
    console.warn("[the-odds-api] Partida França x Espanha não encontrada em /events.");
    return [];
  }

  const commenceTimeMs = new Date(summary.commence_time).getTime();
  const kickoffPassed = Number.isFinite(commenceTimeMs) && Date.now() >= commenceTimeMs;
  if (kickoffPassed && !allowPostKickoffOddsFetch) {
    // Jogo já começou: não gasta cota em odds. Mantém cache antigo se houver.
    if (listCache?.matches.length) {
      listCache = { ...listCache, commenceTimeMs, fetchedAt: listCache.fetchedAt };
      return listCache.matches;
    }
    return [];
  }
  if (allowPostKickoffOddsFetch) {
    allowPostKickoffOddsFetch = false;
  }

  const event = await fetchTargetEventOdds(summary.id);
  if (!event) return [];

  const pinnacleMarkets = pickPinnacleMarkets(event.bookmakers ?? []);
  const match = buildMatch(
    {
      ...event,
      commence_time: summary.commence_time,
      home_team: summary.home_team,
      away_team: summary.away_team,
    },
    pinnacleMarkets
  );

  const matches = match ? [match] : [];
  listCache = {
    matches,
    fetchedAt: Date.now(),
    commenceTimeMs: Number.isFinite(commenceTimeMs) ? commenceTimeMs : null,
  };
  return matches;
}

class OddsApiProvider implements MatchProvider {
  readonly id = "the-odds-api";
  readonly externalIdPrefix = "odds-api-";

  async listUpcomingMatches(): Promise<MatchDTO[]> {
    if (listCache && shouldServeFromCache(listCache)) {
      return listCache.matches;
    }

    if (listInFlight) {
      return listInFlight;
    }

    listInFlight = fetchMatchesFromApi()
      .catch((error) => {
        console.error("[the-odds-api] Falha ao buscar odds:", error);
        // Em erro, devolve o último cache válido se existir (MVP estável).
        if (listCache?.matches.length) return listCache.matches;
        throw error;
      })
      .finally(() => {
        listInFlight = null;
      });

    return listInFlight;
  }
}

/**
 * Busca placares recentes/atuais na The Odds API, usados para liquidar
 * partidas automaticamente (ver `matches-repository.ts`). TTL mais curto
 * só depois que o jogo já deve ter acabado — chamado sob demanda, sem polling.
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

/** Invalida o cache em memória (ex.: após correção de handicap). */
export function invalidateOddsListCache(options?: { allowPostKickoffFetch?: boolean }): void {
  listCache = null;
  if (options?.allowPostKickoffFetch) {
    allowPostKickoffOddsFetch = true;
  }
}
