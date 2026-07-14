import { getMockPerformanceData } from "@/features/performance/data/mock-performance-data";
import type { PerformanceData } from "@/features/performance/types";

/**
 * Ponto único de acesso aos dados de desempenho.
 * Hoje retorna mock; no futuro, agregar apostas do usuário via Prisma
 * mantendo o mesmo tipo `PerformanceData` — a UI não precisa mudar.
 */
export async function getPerformanceData(_userId: string): Promise<PerformanceData> {
  void _userId;
  return getMockPerformanceData();
}
