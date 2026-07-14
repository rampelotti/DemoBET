/** Resumo geral exibido nos cards do topo. */
export interface PerformanceSummary {
  roi: number;
  profitUnits: number;
  winRate: number;
  totalBets: number;
  avgOdd: number;
}

/** Ponto da curva de evolução da banca (Coins). */
export interface BankrollPoint {
  date: string;
  balance: number;
}

/** Linha de uma tabela de breakdown (mercado, liga, time, linha, faixa de odd). */
export interface PerformanceBreakdownRow {
  label: string;
  bets: number;
  wins: number;
  losses: number;
  winRate: number;
  roi: number;
  profitUnits: number;
}

/** Mensagens automáticas da seção Insights. */
export interface PerformanceInsights {
  bestMarket: string;
  worstMarket: string;
  bestLeague: string;
  bestTeam: string;
  bestLine: string;
  bestOddsRange: string;
}

/** Payload completo da página Meu Desempenho. */
export interface PerformanceData {
  summary: PerformanceSummary;
  bankroll: BankrollPoint[];
  byMarket: PerformanceBreakdownRow[];
  byLeague: PerformanceBreakdownRow[];
  byTeam: PerformanceBreakdownRow[];
  byLine: PerformanceBreakdownRow[];
  byOddsRange: PerformanceBreakdownRow[];
  insights: PerformanceInsights;
}
