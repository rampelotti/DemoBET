import type { OddsProvider } from "@/lib/providers/odds-provider";
import { mockOddsProvider } from "@/lib/providers/mock-odds-provider";
import { theOddsProvider } from "@/lib/providers/the-odds-provider";

/**
 * Provider ativo da aplicação. Controlado por `ODDS_PROVIDER` no `.env`:
 *   - `the-odds-api` (MVP atual) → França x Espanha via Pinnacle + cache longo
 *   - `mock` → MockOddsProvider (dados locais, sem cota)
 */
export function getActiveOddsProvider(): OddsProvider {
  const source = (process.env.ODDS_PROVIDER ?? "the-odds-api").toLowerCase();

  if (source === "mock") {
    return mockOddsProvider;
  }

  return theOddsProvider;
}
