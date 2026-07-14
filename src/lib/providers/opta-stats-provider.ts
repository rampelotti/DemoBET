import { normalizePlayerKey } from "@/features/admin/lib/resolve-selection-result";
import type { MatchSettleContext } from "@/features/admin/lib/resolve-selection-result";
import { OPTA_CONFIG } from "@/lib/providers/opta-config";
import { ODDS_API_MVP_CONFIG } from "@/lib/providers/odds-api-mvp-config";

interface OptaContestant {
  id: string;
  name?: string;
  position?: string;
}

interface OptaScoreLine {
  home?: number;
  away?: number;
}

interface OptaMatchDetails {
  matchStatus?: string;
  scores?: {
    ht?: OptaScoreLine;
    ft?: OptaScoreLine;
    total?: OptaScoreLine;
  };
}

interface OptaStat {
  type?: string;
  value?: string | number;
}

interface OptaPlayer {
  matchName?: string;
  firstName?: string;
  lastName?: string;
  stat?: OptaStat[];
}

interface OptaLineUp {
  contestantId: string;
  stat?: OptaStat[];
  player?: OptaPlayer[];
}

interface OptaGoal {
  type?: string;
  scorerName?: string;
  timeMin?: number;
  timestamp?: string;
}

interface OptaCard {
  type?: string;
  playerName?: string;
  contestantId?: string;
}

interface OptaMatchStatsPayload {
  matchInfo?: {
    id?: string;
    description?: string;
    contestant?: OptaContestant[];
  };
  liveData?: {
    matchDetails?: OptaMatchDetails;
    lineUp?: OptaLineUp[];
    goal?: OptaGoal[];
    card?: OptaCard[];
  };
}

interface OptaMatchListItem {
  matchInfo?: {
    id?: string;
    date?: string;
    time?: string;
    contestant?: OptaContestant[];
  };
  liveData?: {
    matchDetails?: OptaMatchDetails;
  };
}

export interface OptaFinishedMatch {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  context: MatchSettleContext;
}

let matchListCache: { expiresAt: number; payload: OptaMatchListItem[] } | null = null;

function optaHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    Referer: OPTA_CONFIG.attributionUrl,
    "User-Agent": "DemoScore/1.0 (simulation; Opta attribution)",
  };
}

function teamName(contestant: OptaContestant | undefined): string {
  return contestant?.name?.trim() ?? "";
}

function isTargetPair(home: string, away: string): boolean {
  const a = ODDS_API_MVP_CONFIG.targetTeams.a;
  const b = ODDS_API_MVP_CONFIG.targetTeams.b;
  const names = [home.toLowerCase(), away.toLowerCase()];
  return names.includes(a) && names.includes(b);
}

function readStat(stats: OptaStat[] | undefined, type: string): number {
  const raw = stats?.find((stat) => stat.type === type)?.value;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function playerDisplayName(player: OptaPlayer): string {
  return (
    player.matchName?.trim() ||
    [player.firstName, player.lastName].filter(Boolean).join(" ").trim() ||
    ""
  );
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: optaHeaders(),
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function listTournamentMatches(): Promise<OptaMatchListItem[]> {
  if (matchListCache && matchListCache.expiresAt > Date.now()) {
    return matchListCache.payload;
  }

  const { baseUrl, outletKey, tournamentCalendarId } = OPTA_CONFIG;
  const url =
    `${baseUrl}/soccerdata/match/${outletKey}/` +
    `?_rt=c&tmcl=${tournamentCalendarId}&live=yes&_pgSz=400&_lcl=en&_fmt=json&sps=widgets`;

  const data = await fetchJson<{ match?: OptaMatchListItem[] }>(url);
  const matches = data?.match ?? [];
  matchListCache = { expiresAt: Date.now() + OPTA_CONFIG.cacheTtlMs, payload: matches };
  return matches;
}

function buildContextFromStats(
  home: OptaContestant,
  away: OptaContestant,
  stats: OptaMatchStatsPayload
): MatchSettleContext | null {
  const details = stats.liveData?.matchDetails;
  const scores = details?.scores;
  const ft = scores?.ft ?? scores?.total;
  if (typeof ft?.home !== "number" || typeof ft?.away !== "number") return null;

  const lineUps = stats.liveData?.lineUp ?? [];
  const homeLine = lineUps.find((line) => line.contestantId === home.id);
  const awayLine = lineUps.find((line) => line.contestantId === away.id);

  const homeCorners = readStat(homeLine?.stat, "wonCorners") || readStat(homeLine?.stat, "cornerTaken");
  const awayCorners = readStat(awayLine?.stat, "wonCorners") || readStat(awayLine?.stat, "cornerTaken");
  const homeYellow = readStat(homeLine?.stat, "totalYellowCard");
  const awayYellow = readStat(awayLine?.stat, "totalYellowCard");
  const homeRed = readStat(homeLine?.stat, "totalRedCard");
  const awayRed = readStat(awayLine?.stat, "totalRedCard");

  const goals = (stats.liveData?.goal ?? [])
    .filter((goal) => goal.type === "G" && goal.scorerName)
    .sort((a, b) => (a.timeMin ?? 0) - (b.timeMin ?? 0) || String(a.timestamp).localeCompare(String(b.timestamp)));

  const goalScorers = [
    ...new Set(goals.map((goal) => normalizePlayerKey(goal.scorerName!))),
  ];

  const cards = stats.liveData?.card ?? [];
  const cardedPlayers = [
    ...new Set(
      cards
        .filter((card) => card.playerName && (card.type === "YC" || card.type === "Y2C" || card.type === "RC"))
        .map((card) => normalizePlayerKey(card.playerName!))
    ),
  ];
  const redCardPlayers = [
    ...new Set(
      cards
        .filter((card) => card.playerName && (card.type === "RC" || card.type === "Y2C"))
        .map((card) => normalizePlayerKey(card.playerName!))
    ),
  ];

  const context: MatchSettleContext = {
    homeScore: ft.home,
    awayScore: ft.away,
    homeScoreHt: scores?.ht?.home,
    awayScoreHt: scores?.ht?.away,
    homeCorners,
    awayCorners,
    homeCards: homeYellow + homeRed,
    awayCards: awayYellow + awayRed,
  };

  if (goals.length > 0) {
    context.goalScorers = goalScorers;
    context.firstScorer = normalizePlayerKey(goals[0].scorerName!);
    context.lastScorer = normalizePlayerKey(goals[goals.length - 1].scorerName!);
  }
  if (cardedPlayers.length > 0) context.cardedPlayers = cardedPlayers;
  if (redCardPlayers.length > 0 || cardedPlayers.length > 0) {
    context.redCardPlayers = redCardPlayers;
  }

  // Fallback scorers from lineup stats if goal events missing
  if (!context.goalScorers) {
    const fromLineup: string[] = [];
    for (const line of [homeLine, awayLine]) {
      for (const player of line?.player ?? []) {
        if (readStat(player.stat, "goals") > 0) {
          const name = playerDisplayName(player);
          if (name) fromLineup.push(normalizePlayerKey(name));
        }
      }
    }
    if (fromLineup.length > 0) context.goalScorers = [...new Set(fromLineup)];
  }

  return context;
}

/**
 * Busca resultado + estatísticas Opta da partida-alvo (França x Espanha no MVP).
 * Usado na liquidação automática com HT, escanteios, cartões e artílheiros.
 */
export async function fetchOptaFinishedTargetMatch(): Promise<OptaFinishedMatch | null> {
  const matches = await listTournamentMatches();
  const candidates = matches.filter((match) => {
    const home = match.matchInfo?.contestant?.find((c) => c.position === "home");
    const away = match.matchInfo?.contestant?.find((c) => c.position === "away");
    if (!home?.name || !away?.name) return false;
    if (!isTargetPair(home.name, away.name)) return false;
    return match.liveData?.matchDetails?.matchStatus === "Played";
  });

  // Pega a partida alvo mais recente já encerrada (semi França x Espanha).
  const target = candidates.sort((a, b) => {
    const aAt = `${a.matchInfo?.date ?? ""}${a.matchInfo?.time ?? ""}`;
    const bAt = `${b.matchInfo?.date ?? ""}${b.matchInfo?.time ?? ""}`;
    return bAt.localeCompare(aAt);
  })[0];

  const fixtureId = target?.matchInfo?.id;
  if (!fixtureId) return null;

  const home = target.matchInfo!.contestant!.find((c) => c.position === "home")!;
  const away = target.matchInfo!.contestant!.find((c) => c.position === "away")!;

  const { baseUrl, outletKey } = OPTA_CONFIG;
  const statsUrl =
    `${baseUrl}/soccerdata/matchstats/${outletKey}/` +
    `?fx=${fixtureId}&detailed=yes&_fmt=json&sps=widgets`;
  const stats = await fetchJson<OptaMatchStatsPayload>(statsUrl);
  if (!stats) return null;

  const context = buildContextFromStats(home, away, stats);
  if (!context) return null;

  return {
    fixtureId,
    homeTeam: teamName(home),
    awayTeam: teamName(away),
    context,
  };
}

export function teamsMatchOpta(
  dbHome: string,
  dbAway: string,
  optaHome: string,
  optaAway: string
): boolean {
  const norm = (value: string) => value.toLowerCase().trim();
  return norm(dbHome) === norm(optaHome) && norm(dbAway) === norm(optaAway);
}
