import { settleMatchCore } from "@/features/betting/lib/settle-match-core";
import type { MatchDTO } from "@/features/betting/types";
import { getActiveOddsProvider } from "@/lib/providers/get-active-odds-provider";
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
  const existingTypes = new Set(
    (await prisma.market.findMany({ where: { matchId }, select: { type: true } })).map((m) => m.type)
  );

  const newMarkets = providerMarkets.filter((market) => !existingTypes.has(market.type));
  if (newMarkets.length === 0) return 0;

  for (const market of newMarkets) {
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
  }

  return newMarkets.length;
}

/**
 * Importa partidas do `OddsProvider` ativo (ou um provider explícito) para o
 * banco. Partidas novas são criadas; existentes recebem apenas mercados novos.
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
      scoreEvent.homeScore,
      scoreEvent.awayScore,
      `system:${provider.id}-auto`
    );
  }
}

export async function getUpcomingMatches(sport?: string, search?: string) {
  const provider = getActiveOddsProvider();
  const prefix = provider.externalIdPrefix;

  await settleFinishedMatches(provider).catch(() => {});

  const scheduledCount = await prisma.match.count({
    where: { status: "SCHEDULED", externalId: { startsWith: prefix } },
  });

  if (scheduledCount === 0) {
    await importMatchesFromProvider(provider).catch(() => {});
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
