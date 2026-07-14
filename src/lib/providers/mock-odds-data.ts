import type { MarketDTO, MatchDTO } from "@/features/betting/types";
import { SPORTS } from "@/features/betting/types";

const PREFIX = "mock-";

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** Escudos via football-data.org (times europeus) ou avatar gerado (demais). */
const TEAM_CRESTS: Record<string, string> = {
  "Manchester City": "https://crests.football-data.org/65.svg",
  Liverpool: "https://crests.football-data.org/64.svg",
  Arsenal: "https://crests.football-data.org/57.svg",
  Chelsea: "https://crests.football-data.org/61.svg",
  "Manchester United": "https://crests.football-data.org/66.svg",
  Tottenham: "https://crests.football-data.org/73.svg",
  Newcastle: "https://crests.football-data.org/67.svg",
  "Aston Villa": "https://crests.football-data.org/58.svg",
  "Real Madrid": "https://crests.football-data.org/86.svg",
  Barcelona: "https://crests.football-data.org/81.svg",
  "Atlético Madrid": "https://crests.football-data.org/78.svg",
  Sevilla: "https://crests.football-data.org/559.svg",
  Villarreal: "https://crests.football-data.org/94.svg",
  "Real Sociedad": "https://crests.football-data.org/92.svg",
  Valencia: "https://crests.football-data.org/95.svg",
  "Real Betis": "https://crests.football-data.org/90.svg",
  Bayern: "https://crests.football-data.org/5.svg",
  "Paris Saint-Germain": "https://crests.football-data.org/524.svg",
  Inter: "https://crests.football-data.org/108.svg",
  "Borussia Dortmund": "https://crests.football-data.org/4.svg",
  Benfica: "https://crests.football-data.org/1903.svg",
  Porto: "https://crests.football-data.org/503.svg",
  Ajax: "https://crests.football-data.org/678.svg",
  Napoli: "https://crests.football-data.org/113.svg",
  Boca: "https://crests.football-data.org/451.svg",
  River: "https://crests.football-data.org/435.svg",
};

const LEAGUE_LOGOS: Record<string, string> = {
  "Brasileirão Série A": "https://crests.football-data.org/BSA.svg",
  "Premier League": "https://crests.football-data.org/PL.svg",
  "La Liga": "https://crests.football-data.org/PD.svg",
  "UEFA Champions League": "https://crests.football-data.org/CL.svg",
  "Copa Libertadores": "https://crests.football-data.org/CLI.svg",
  "Copa do Brasil": "https://crests.football-data.org/CBD.svg",
};

function crestFor(team: string): string {
  if (TEAM_CRESTS[team]) return TEAM_CRESTS[team];
  const abbr = team
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(abbr)}&background=dc2626&color=fff&bold=true&size=128`;
}

function roundOdd(value: number): number {
  return Math.round(value * 100) / 100;
}

function threeWay(home: string, away: string, h: number, d: number, a: number): MarketDTO {
  return {
    type: "MATCH_WINNER",
    label: "Resultado final",
    odds: [
      { selection: "HOME", label: home, value: roundOdd(h) },
      { selection: "DRAW", label: "Empate", value: roundOdd(d) },
      { selection: "AWAY", label: away, value: roundOdd(a) },
    ],
  };
}

function doubleChance(home: string, away: string, hd: number, ha: number, da: number): MarketDTO {
  return {
    type: "DOUBLE_CHANCE",
    label: "Dupla chance",
    odds: [
      { selection: "HOME_OR_DRAW", label: `${home} ou Empate`, value: roundOdd(hd) },
      { selection: "HOME_OR_AWAY", label: `${home} ou ${away}`, value: roundOdd(ha) },
      { selection: "DRAW_OR_AWAY", label: `Empate ou ${away}`, value: roundOdd(da) },
    ],
  };
}

function drawNoBet(home: string, away: string, h: number, a: number): MarketDTO {
  return {
    type: "DRAW_NO_BET",
    label: "Empate anula",
    odds: [
      { selection: "HOME", label: home, value: roundOdd(h) },
      { selection: "AWAY", label: away, value: roundOdd(a) },
    ],
  };
}

function handicap(home: string, away: string, line: number, h: number, a: number): MarketDTO {
  const sign = line > 0 ? `+${line}` : `${line}`;
  const awayPoint = -line;
  const awaySign = awayPoint > 0 ? `+${awayPoint}` : `${awayPoint}`;
  return {
    type: `SPREADS_${line}`,
    label: `Handicap - ${sign}`,
    odds: [
      { selection: `HOME_${line}`, label: `${home} (${sign})`, value: roundOdd(h) },
      { selection: `AWAY_${awayPoint}`, label: `${away} (${awaySign})`, value: roundOdd(a) },
    ],
  };
}

function totalGoals(line: number, over: number, under: number): MarketDTO {
  return {
    type: `OVER_UNDER_${line}`,
    label: `Total de gols - Mais/Menos de ${line}`,
    odds: [
      { selection: "OVER", label: `Mais de ${line}`, value: roundOdd(over) },
      { selection: "UNDER", label: `Menos de ${line}`, value: roundOdd(under) },
    ],
  };
}

function teamTotal(team: string, side: "HOME" | "AWAY", line: number, over: number, under: number): MarketDTO {
  const prefix = side === "HOME" ? "TEAM_TOTAL_HOME" : "TEAM_TOTAL_AWAY";
  return {
    type: `${prefix}_${line}`,
    label: `Total de gols - ${team} - Mais/Menos de ${line}`,
    odds: [
      { selection: "OVER", label: `Mais de ${line}`, value: roundOdd(over) },
      { selection: "UNDER", label: `Menos de ${line}`, value: roundOdd(under) },
    ],
  };
}

function btts(yes: number, no: number): MarketDTO {
  return {
    type: "BOTH_TEAMS_SCORE",
    label: "Ambas as equipes marcam",
    odds: [
      { selection: "YES", label: "Sim", value: roundOdd(yes) },
      { selection: "NO", label: "Não", value: roundOdd(no) },
    ],
  };
}

function correctScore(scores: [string, number][]): MarketDTO {
  return {
    type: "CORRECT_SCORE",
    label: "Placar exato",
    odds: scores.map(([score, price]) => ({
      selection: score,
      label: score.replace("-", ":"),
      value: roundOdd(price),
    })),
  };
}

function h1Winner(home: string, away: string, h: number, d: number, a: number): MarketDTO {
  return {
    type: "MATCH_WINNER_H1",
    label: "Resultado do 1º tempo",
    odds: [
      { selection: "HOME", label: home, value: roundOdd(h) },
      { selection: "DRAW", label: "Empate", value: roundOdd(d) },
      { selection: "AWAY", label: away, value: roundOdd(a) },
    ],
  };
}

function h1Total(line: number, over: number, under: number): MarketDTO {
  return {
    type: `OVER_UNDER_H1_${line}`,
    label: `Total de gols 1º tempo - Mais/Menos de ${line}`,
    odds: [
      { selection: "OVER", label: `Mais de ${line}`, value: roundOdd(over) },
      { selection: "UNDER", label: `Menos de ${line}`, value: roundOdd(under) },
    ],
  };
}

function h1Btts(yes: number, no: number): MarketDTO {
  return {
    type: "BOTH_TEAMS_SCORE_H1",
    label: "Ambas marcam no 1º tempo",
    odds: [
      { selection: "YES", label: "Sim", value: roundOdd(yes) },
      { selection: "NO", label: "Não", value: roundOdd(no) },
    ],
  };
}

function cornersWinner(home: string, away: string, h: number, d: number, a: number): MarketDTO {
  return {
    type: "CORNERS_WINNER",
    label: "Mais escanteios",
    odds: [
      { selection: "HOME", label: home, value: roundOdd(h) },
      { selection: "DRAW", label: "Empate", value: roundOdd(d) },
      { selection: "AWAY", label: away, value: roundOdd(a) },
    ],
  };
}

function cornersTotal(line: number, over: number, under: number): MarketDTO {
  return {
    type: `CORNERS_OVER_UNDER_${line}`,
    label: `Total de escanteios - Mais/Menos de ${line}`,
    odds: [
      { selection: "OVER", label: `Mais de ${line}`, value: roundOdd(over) },
      { selection: "UNDER", label: `Menos de ${line}`, value: roundOdd(under) },
    ],
  };
}

function cardsTotal(line: number, over: number, under: number): MarketDTO {
  return {
    type: `CARDS_OVER_UNDER_${line}`,
    label: `Total de cartões - Mais/Menos de ${line}`,
    odds: [
      { selection: "OVER", label: `Mais de ${line}`, value: roundOdd(over) },
      { selection: "UNDER", label: `Menos de ${line}`, value: roundOdd(under) },
    ],
  };
}

function playerScorer(players: [string, number][]): MarketDTO {
  return {
    type: "PLAYER_GOAL_SCORER_ANYTIME",
    label: "Marca a qualquer momento",
    odds: players.map(([name, price]) => ({
      selection: name.toUpperCase().replace(/\s/g, "_"),
      label: name,
      value: roundOdd(price),
    })),
  };
}

function playerCard(players: [string, number][]): MarketDTO {
  return {
    type: "PLAYER_TO_RECEIVE_CARD",
    label: "Recebe cartão",
    odds: players.map(([name, price]) => ({
      selection: name.toUpperCase().replace(/\s/g, "_"),
      label: name,
      value: roundOdd(price),
    })),
  };
}

interface FixtureInput {
  id: string;
  league: string;
  home: string;
  away: string;
  hours: number;
  /** 0 = equilibrado, positivo = casa favorita */
  homeAdvantage: number;
  scorers: [string, string, string];
}

function buildMarkets(input: FixtureInput): MarketDTO[] {
  const { home, away, homeAdvantage } = input;
  const fav = homeAdvantage;
  const hOdd = roundOdd(2.4 - fav * 0.35);
  const aOdd = roundOdd(2.4 + fav * 0.35);
  const dOdd = roundOdd(3.2 - Math.abs(fav) * 0.1);

  return [
    threeWay(home, away, hOdd, dOdd, aOdd),
    doubleChance(home, away, roundOdd(1.35 - fav * 0.05), roundOdd(1.28), roundOdd(1.35 + fav * 0.05)),
    drawNoBet(home, away, roundOdd(1.75 - fav * 0.15), roundOdd(1.75 + fav * 0.15)),
    handicap(home, away, -1, roundOdd(2.8 - fav * 0.2), roundOdd(1.45 + fav * 0.1)),
    handicap(home, away, -0.5, roundOdd(2.1 - fav * 0.15), roundOdd(1.75 + fav * 0.1)),
    totalGoals(1.5, roundOdd(1.35), roundOdd(3.1)),
    totalGoals(2.5, roundOdd(1.85 - fav * 0.05), roundOdd(1.95 + fav * 0.05)),
    totalGoals(3.5, roundOdd(2.9), roundOdd(1.4)),
    teamTotal(home, "HOME", 1.5, roundOdd(2.0 - fav * 0.1), roundOdd(1.8 + fav * 0.1)),
    teamTotal(away, "AWAY", 1.5, roundOdd(2.0 + fav * 0.1), roundOdd(1.8 - fav * 0.1)),
    btts(roundOdd(1.72), roundOdd(2.05)),
    correctScore([
      ["1-0", 7.5],
      ["2-1", 8.5],
      ["1-1", 6.0],
      ["2-0", 9.0],
      ["0-0", 10.0],
      ["0-1", 8.0],
      ["1-2", 9.5],
      ["2-2", 12.0],
    ]),
    h1Winner(home, away, roundOdd(hOdd + 0.15), roundOdd(2.1), roundOdd(aOdd + 0.15)),
    h1Total(0.5, roundOdd(1.45), roundOdd(2.65)),
    h1Total(1.5, roundOdd(2.8), roundOdd(1.42)),
    h1Btts(roundOdd(3.8), roundOdd(1.22)),
    cornersWinner(home, away, roundOdd(1.9 - fav * 0.1), roundOdd(7.5), roundOdd(2.1 + fav * 0.1)),
    cornersTotal(8.5, roundOdd(1.85), roundOdd(1.9)),
    cornersTotal(9.5, roundOdd(2.1), roundOdd(1.7)),
    cornersTotal(10.5, roundOdd(2.45), roundOdd(1.52)),
    cardsTotal(3.5, roundOdd(1.9), roundOdd(1.85)),
    cardsTotal(4.5, roundOdd(2.3), roundOdd(1.58)),
    playerScorer([
      [input.scorers[0], roundOdd(2.4 - fav * 0.2)],
      [input.scorers[1], roundOdd(3.2)],
      [input.scorers[2], roundOdd(3.8 + fav * 0.2)],
    ]),
    playerCard([
      [input.scorers[0], roundOdd(2.8)],
      [input.scorers[1], roundOdd(3.1)],
      [input.scorers[2], roundOdd(3.4)],
    ]),
  ];
}

const FIXTURES: FixtureInput[] = [
  { id: "001", league: "Brasileirão Série A", home: "Flamengo", away: "Palmeiras", hours: 6, homeAdvantage: 0.2, scorers: ["Pedro", "Gabriel", "Endrick"] },
  { id: "002", league: "Brasileirão Série A", home: "Corinthians", away: "São Paulo", hours: 10, homeAdvantage: -0.1, scorers: ["Yuri Alberto", "Luciano", "Calleri"] },
  { id: "003", league: "Brasileirão Série A", home: "Grêmio", away: "Internacional", hours: 28, homeAdvantage: 0, scorers: ["Suárez", "Wanderson", "Borré"] },
  { id: "004", league: "Brasileirão Série A", home: "Fluminense", away: "Botafogo", hours: 32, homeAdvantage: 0.1, scorers: ["Cano", "Tiquinho", "Savarino"] },
  { id: "005", league: "Brasileirão Série A", home: "Atlético-MG", away: "Cruzeiro", hours: 48, homeAdvantage: 0.15, scorers: ["Hulk", "Paulinho", "Dudu"] },
  { id: "006", league: "Premier League", home: "Manchester City", away: "Liverpool", hours: 14, homeAdvantage: 0.35, scorers: ["Haaland", "Salah", "Foden"] },
  { id: "007", league: "Premier League", home: "Arsenal", away: "Chelsea", hours: 18, homeAdvantage: 0.25, scorers: ["Saka", "Palmer", "Rice"] },
  { id: "008", league: "Premier League", home: "Manchester United", away: "Tottenham", hours: 22, homeAdvantage: -0.05, scorers: ["Rashford", "Son", "Bruno"] },
  { id: "009", league: "Premier League", home: "Newcastle", away: "Aston Villa", hours: 38, homeAdvantage: 0.1, scorers: ["Isak", "Watkins", "Gordon"] },
  { id: "010", league: "La Liga", home: "Real Madrid", away: "Barcelona", hours: 20, homeAdvantage: 0.2, scorers: ["Vinícius Jr", "Lewandowski", "Bellingham"] },
  { id: "011", league: "La Liga", home: "Atlético Madrid", away: "Sevilla", hours: 26, homeAdvantage: 0.4, scorers: ["Griezmann", "Lamela", "Morata"] },
  { id: "012", league: "La Liga", home: "Villarreal", away: "Real Sociedad", hours: 42, homeAdvantage: 0.05, scorers: ["Baena", "Oyarzabal", "Moreno"] },
  { id: "013", league: "La Liga", home: "Valencia", away: "Real Betis", hours: 50, homeAdvantage: -0.15, scorers: ["Duro", "Isco", "Gayà"] },
  { id: "014", league: "UEFA Champions League", home: "Bayern", away: "Paris Saint-Germain", hours: 30, homeAdvantage: 0.15, scorers: ["Kane", "Mbappé", "Musiala"] },
  { id: "015", league: "UEFA Champions League", home: "Inter", away: "Borussia Dortmund", hours: 34, homeAdvantage: 0.3, scorers: ["Lautaro", "Reus", "Thuram"] },
  { id: "016", league: "UEFA Champions League", home: "Benfica", away: "Porto", hours: 44, homeAdvantage: 0.1, scorers: ["Di María", "Taremi", "Rafa"] },
  { id: "017", league: "UEFA Champions League", home: "Ajax", away: "Napoli", hours: 52, homeAdvantage: -0.2, scorers: ["Bergwijn", "Osimhen", "Kudus"] },
  { id: "018", league: "Copa Libertadores", home: "Boca", away: "River", hours: 16, homeAdvantage: 0.05, scorers: ["Cavani", "Borja", "Merentiel"] },
  { id: "019", league: "Copa Libertadores", home: "Flamengo", away: "Palmeiras", hours: 40, homeAdvantage: 0.15, scorers: ["Pedro", "Rony", "Gerson"] },
  { id: "020", league: "Copa Libertadores", home: "Peñarol", away: "Nacional", hours: 46, homeAdvantage: 0, scorers: ["Arias", "Bergvall", "López"] },
  { id: "021", league: "Copa Libertadores", home: "Colo-Colo", away: "Olimpia", hours: 54, homeAdvantage: 0.25, scorers: ["Pizarro", "Gómez", "Castillo"] },
  { id: "022", league: "Copa do Brasil", home: "Santos", away: "Vasco", hours: 12, homeAdvantage: 0.1, scorers: ["Soteldo", "Vegetti", "Guilherme"] },
  { id: "023", league: "Copa do Brasil", home: "Athletico-PR", away: "Fortaleza", hours: 24, homeAdvantage: 0.05, scorers: ["Pablo", "Moisés", "Fernandinho"] },
  { id: "024", league: "Copa do Brasil", home: "Bahia", away: "Sport", hours: 36, homeAdvantage: 0.2, scorers: ["Everaldo", "Lucero", "Cauly"] },
  { id: "025", league: "Copa do Brasil", home: "Ceará", away: "Goiás", hours: 60, homeAdvantage: 0.15, scorers: ["Vina", "Dieguinho", "Janderson"] },
];

export function buildMockFixtures(): MatchDTO[] {
  return FIXTURES.map((fixture) => ({
    externalId: `${PREFIX}${fixture.id}`,
    sport: SPORTS.FOOTBALL,
    league: fixture.league,
    homeTeam: fixture.home,
    awayTeam: fixture.away,
    homeCrestUrl: crestFor(fixture.home),
    awayCrestUrl: crestFor(fixture.away),
    leagueLogoUrl: LEAGUE_LOGOS[fixture.league],
    startTime: hoursFromNow(fixture.hours),
    markets: buildMarkets(fixture),
  }));
}

export const MOCK_ODDS_PREFIX = PREFIX;
