import { settleMatchCore } from "@/features/betting/lib/settle-match-core";
import type { MatchDTO } from "@/features/betting/types";
import { getActiveOddsProvider } from "@/lib/providers/get-active-odds-provider";
import { ODDS_API_MVP_CONFIG } from "@/lib/providers/odds-api-mvp-config";
import type { OddsProvider } from "@/lib/providers/odds-provider";
import { prisma } from "@/lib/prisma";
import { buildMatchSlug } from "@/lib/slug";

const ASSUMED_MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000;

async function generateUniqueMatchSlug(homeTeam: string, awayTeam: string): Promise<string> {
  const baseSlug = buildMatchSlug(homeTeam, awayTeam);

  let candidate = baseSlug;
  let attempt = 2;
  while (await prisma.match.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${attempt}`;
    attempt++;
  }

  return candidate;
}

async function syncNewMarketsIntoExistingMatch(
  matchId: string,
  providerMarkets: MatchDTO["markets"]
): Promise<number> {
  const existingMarkets = await prisma.market.findMany({
    where: { matchId },
    include: { odds: true },
  });
  const byType = new Map(existingMarkets.map((market) => [market.type, market]));

  let changed = 0;

  for (const market of providerMarkets) {
    const existing = byType.get(market.type);

    if (!existing) {
      await prisma.market.create({
        data: {
          matchId,
          type: market.type,
          label: market.label,
          odds: {
            create: market.odds.map((odd) => ({
              selection: odd.selection,
              label: odd.label,
              value: odd.value,
            })),
          },
        },
      });
      changed += 1;
      continue;
    }

    if (existing.label !== market.label) {
      await prisma.market.update({
        where: { id: existing.id },
        data: { label: market.label },
      });
    }

    const oddsBySelection = new Map(existing.odds.map((odd) => [odd.selection, odd]));
    for (const odd of market.odds) {
      const current = oddsBySelection.get(odd.selection);
      if (!current) {
        await prisma.odd.create({
          data: {
            marketId: existing.id,
            selection: odd.selection,
            label: odd.label,
            value: odd.value,
          },
        });
        changed += 1;
        continue;
      }

      if (current.value !== odd.value || current.label !== odd.label || !current.isActive) {
        await prisma.odd.update({
          where: { id: current.id },
          data: {
            value: odd.value,
            label: odd.label,
            isActive: true,
          },
        });
        changed += 1;
      }
    }
  }

  return changed;
}

/**
 * Importa partidas do `OddsProvider` ativo (ou um provider explícito) para o
 * banco. Partidas novas são criadas; existentes recebem mercados/odds novos
 * e atualização de preços quando o cache do provider refrescar.
 */
export async function importMatchesFromProvider(provider?: OddsProvider) {
  const activeProvider = provider ?? getActiveOddsProvider();
  const matches = await activeProvider.listUpcomingMatches();
  let imported = 0;

  for (const match of matches) {
    const existing = await prisma.match.findUnique({
      where: { externalId: match.externalId },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          startTime: match.startTime,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          homeCrestUrl: match.homeCrestUrl,
          awayCrestUrl: match.awayCrestUrl,
          leagueLogoUrl: match.leagueLogoUrl,
        },
      });
      await syncNewMarketsIntoExistingMatch(existing.id, match.markets);
      continue;
    }

    const slug = await generateUniqueMatchSlug(match.homeTeam, match.awayTeam);

    await prisma.match.create({
      data: {
        externalId: match.externalId,
        slug,
        sport: match.sport,
        league: match.league,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeCrestUrl: match.homeCrestUrl,
        awayCrestUrl: match.awayCrestUrl,
        leagueLogoUrl: match.leagueLogoUrl,
        startTime: match.startTime,
        markets: {
          create: match.markets.map((market) => ({
            type: market.type,
            label: market.label,
            odds: {
              create: market.odds.map((odd) => ({
                selection: odd.selection,
                label: odd.label,
                value: odd.value,
              })),
            },
          })),
        },
      },
    });
    imported++;
  }

  return imported;
}

async function settleFinishedMatches(provider: OddsProvider): Promise<void> {
  if (!provider.fetchFinishedScores) return;

  const dueMatches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      externalId: { startsWith: provider.externalIdPrefix },
    },
    select: { id: true, externalId: true, startTime: true, homeTeam: true, awayTeam: true },
  });

  if (dueMatches.length === 0) return;

  const anyLikelyOver = dueMatches.some(
    (match) => Date.now() - match.startTime.getTime() > ASSUMED_MATCH_DURATION_MS
  );
  if (!anyLikelyOver) return;

  const scores = await provider.fetchFinishedScores().catch(() => []);
  if (scores.length === 0) return;

  for (const match of dueMatches) {
    const scoreEvent = scores.find((event) => event.externalId === match.externalId);
    if (!scoreEvent?.completed) continue;

    await settleMatchCore(
      match.id,
      {
        homeScore: scoreEvent.homeScore,
        awayScore: scoreEvent.awayScore,
      },
      `system:${provider.id}-auto`
    );
  }
}

export async function getUpcomingMatches(sport?: string, search?: string) {
  const provider = getActiveOddsProvider();
  const prefix = provider.externalIdPrefix;

  await settleFinishedMatches(provider).catch(() => {});

  // Cache compartilhado real = Postgres (válido para todos os usuários /
  // instâncias serverless). Só chama The Odds API quando o snapshot no DB
  // está ausente ou o TTL expirou — e nunca após o kickoff.
  const latestSynced = await prisma.match.findFirst({
    where: { status: "SCHEDULED", externalId: { startsWith: prefix } },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true, startTime: true },
  });

  const now = Date.now();
  const ttlMs = ODDS_API_MVP_CONFIG.cacheTtlMs;
  const hasFreshDbSnapshot =
    !!latestSynced &&
    (latestSynced.startTime.getTime() <= now ||
      now - latestSynced.updatedAt.getTime() < ttlMs);

  if (!hasFreshDbSnapshot) {
    await importMatchesFromProvider(provider).catch((error) => {
      console.error("[matches-repository] Falha ao sincronizar provider:", error);
    });
  }

  const trimmedSearch = search?.trim();

  return prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      externalId: { startsWith: prefix },
      ...(sport ? { sport } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              { homeTeam: { contains: trimmedSearch, mode: "insensitive" } },
              { awayTeam: { contains: trimmedSearch, mode: "insensitive" } },
              { league: { contains: trimmedSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { startTime: "asc" },
    include: {
      markets: {
        include: {
          odds: { where: { isActive: true } },
        },
      },
    },
  });
}

export async function getMatchById(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      markets: {
        include: { odds: { where: { isActive: true } } },
      },
    },
  });
}

export async function getMatchBySlug(slug: string) {
  return prisma.match.findUnique({
    where: { slug },
    include: {
      markets: {
        include: { odds: { where: { isActive: true } } },
      },
    },
  });
}
