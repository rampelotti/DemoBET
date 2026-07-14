import type { OddsProvider } from "@/lib/providers/odds-provider";
import { buildMockFixtures, MOCK_ODDS_PREFIX } from "@/lib/providers/mock-odds-data";

/**
 * Provider mock com 25 partidas futuras de futebol, mercados completos por
 * categoria (Partida, 1º Tempo, Gols, Escanteios, Cartões, Jogadores) e
 * escudos/campeonatos realistas. É o provider padrão enquanto a The Odds API
 * estiver pausada (`ODDS_PROVIDER=mock`).
 */
class MockOddsProvider implements OddsProvider {
  readonly id = "mock";
  readonly externalIdPrefix = MOCK_ODDS_PREFIX;

  async listUpcomingMatches() {
    return buildMockFixtures();
  }
}

export const mockOddsProvider: OddsProvider = new MockOddsProvider();

/** @deprecated Use `mockOddsProvider` */
export const mockMatchProvider = mockOddsProvider;
