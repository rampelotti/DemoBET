import type { PerformanceData } from "@/features/performance/types";

function row(
  label: string,
  bets: number,
  wins: number,
  profitUnits: number
): PerformanceData["byMarket"][number] {
  const losses = bets - wins;
  const winRate = bets > 0 ? (wins / bets) * 100 : 0;
  const staked = bets * 50;
  const roi = staked > 0 ? (profitUnits / staked) * 100 : 0;
  return { label, bets, wins, losses, winRate, roi, profitUnits };
}

function buildBankroll(): PerformanceData["bankroll"] {
  const points: PerformanceData["bankroll"] = [];
  let balance = 8200;
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    balance += Math.round((Math.random() - 0.42) * 280);
    balance = Math.max(6500, Math.min(12800, balance));
    points.push({
      date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      balance,
    });
  }

  return points;
}

/**
 * Dados mockados para a página Meu Desempenho.
 * Substituir por agregações reais do Prisma em `get-performance-data.ts`
 * quando conectar ao banco (mesma interface `PerformanceData`).
 */
export function getMockPerformanceData(): PerformanceData {
  const byMarket = [
    row("Escanteios", 48, 27, 620),
    row("Over gols", 62, 34, 480),
    row("Under gols", 41, 19, -210),
    row("BTTS (Ambas marcam)", 55, 28, 350),
    row("Handicap asiático", 33, 15, -95),
    row("Resultado final", 38, 17, 120),
    row("Dupla chance", 29, 18, 290),
    row("Cartões", 22, 12, 180),
    row("1º tempo", 18, 9, 45),
    row("Props jogador", 14, 5, -80),
  ];

  const byLeague = [
    row("Brasileirão Série A", 72, 38, 890),
    row("Premier League", 45, 22, 310),
    row("La Liga", 38, 19, 220),
    row("UEFA Champions League", 28, 14, 175),
    row("Copa Libertadores", 32, 16, 140),
    row("Copa do Brasil", 24, 11, -45),
  ];

  const byTeam = [
    row("Flamengo", 28, 16, 420),
    row("Palmeiras", 22, 11, 185),
    row("Manchester City", 18, 10, 260),
    row("Real Madrid", 16, 9, 195),
    row("Liverpool", 14, 6, -70),
    row("Barcelona", 12, 7, 110),
    row("Corinthians", 11, 4, -90),
    row("Bayern", 10, 6, 130),
  ];

  const byLine = [
    row("Over 7.5 escanteios", 18, 11, 285),
    row("Over 8.5 escanteios", 15, 8, 190),
    row("Over 9.5 escanteios", 12, 5, -60),
    row("Under 2.5 gols", 22, 13, 240),
    row("Over 2.5 gols", 28, 14, 180),
    row("Over 1.5 gols 1º tempo", 14, 7, 95),
    row("Over 4.5 cartões", 10, 6, 120),
    row("Under 10.5 escanteios", 9, 5, 55),
  ];

  const byOddsRange = [
    row("1.01 – 1.50", 24, 18, 210),
    row("1.51 – 2.00", 58, 31, 540),
    row("2.01 – 3.00", 72, 32, 380),
    row("3.01 – 5.00", 35, 12, -120),
    row("5.01+", 12, 2, -185),
  ];

  const bankroll = buildBankroll();
  const lastBalance = bankroll[bankroll.length - 1]?.balance ?? 10000;
  const firstBalance = bankroll[0]?.balance ?? 10000;
  const profitUnits = lastBalance - firstBalance;
  const totalStaked = 239 * 50;
  const roi = (profitUnits / totalStaked) * 100;

  return {
    summary: {
      roi,
      profitUnits,
      winRate: 47.3,
      totalBets: 239,
      avgOdd: 2.14,
    },
    bankroll,
    byMarket,
    byLeague,
    byTeam,
    byLine,
    byOddsRange,
    insights: {
      bestMarket: "Escanteios (+12,4 u. de lucro)",
      worstMarket: "Handicap asiático (-1,9 u.)",
      bestLeague: "Brasileirão Série A (+17,8 u.)",
      bestTeam: "Flamengo (+8,4 u.)",
      bestLine: "Over 7.5 escanteios (+5,7 u.)",
      bestOddsRange: "1.51 – 2.00 (+10,8 u.)",
    },
  };
}
