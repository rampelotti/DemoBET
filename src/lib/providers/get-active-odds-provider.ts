import type { OddsProvider } from "@/lib/providers/odds-provider";
import { mockOddsProvider } from "@/lib/providers/mock-odds-provider";
import { theOddsProvider } from "@/lib/providers/the-odds-provider";

/**
 * Provider ativo da aplicação. Controlado por `ODDS_PROVIDER` no `.env`:
 *   - `mock` (padrão) → MockOddsProvider
 *   - `the-odds-api` → TheOddsProvider (integração existente, pausada por padrão)
 */
export function getActiveOddsProvider(): OddsProvider {
  const source = (process.env.ODDS_PROVIDER ?? "mock").toLowerCase();

  if (source === "the-odds-api" || source === "odds-api") {
    return theOddsProvider;
  }

  return mockOddsProvider;
}
