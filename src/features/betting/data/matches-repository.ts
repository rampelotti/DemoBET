import { settleMatchCore } from "@/features/betting/lib/settle-match-core";
import type { MatchDTO } from "@/features/betting/types";
import { getActiveOddsProvider } from "@/lib/providers/get-active-odds-provider";
import { ODDS_API_MVP_CONFIG } from "@/lib/providers/odds-api-mvp-config";
import { invalidateOddsListCache } from "@/lib/providers/odds-api-provider";
import {
  fetchOptaFinishedTargetMatch,
  teamsMatchOpta,
} from "@/lib/providers/opta-stats-provider";
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

/**
 * Remove odds de handicap que não formam par complementar (casa +X com
 * visitante −X). Corrige snapshots antigos onde o mapper agrupava pelo
 * `point` absoluto (ex.: França +1 + Espanha +1 → UI mostrava Espanha −1
 * com a odd errada).
 */
async function deactivateNonComplementarySpreadOdds(matchId: string): Promise<number> {
  const markets = await prisma.market.findMany({
    where: { matchId, type: { contains: "SPREADS" } },
    include: { odds: { where: { isActive: true } } },
  });

  let changed = 0;

  for (const market of markets) {
    const homes: { point: number; id: string }[] = [];
    const aways: { point: number; id: string }[] = [];

    for (const odd of market.odds) {
      const parsed = /^(HOME|AWAY)_([+-]?[\d.]+)$/.exec(odd.selection);
      if (!parsed) continue;
      const point = Number(parsed[2]);
      if (!Number.isFinite(point)) continue;
      if (parsed[1] === "HOME") homes.push({ point, id: odd.id });
      else aways.push({ point, id: odd.id });
    }

    const keep = new Set<string>();
    for (const home of homes) {
      const away = aways.find((entry) => Math.abs(entry.point + home.point) < 1e-9);
      if (!away) continue;
      keep.add(home.id);
      keep.add(away.id);
    }

    for (const odd of market.odds) {
      if (keep.has(odd.id)) continue;
      await prisma.odd.update({
        where: { id: odd.id },
        data: { isActive: false },
      });
      changed += 1;
    }
  }

  return changed;
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
  const providerTypes = new Set(providerMarkets.map((market) => market.type));

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
    const providerSelections = new Set(market.odds.map((odd) => odd.selection));

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

    // Desativa seleções de handicap/linha que a API não devolve mais
    // (evita pares fantasma tipo "França +1" com preço errado).
    for (const current of existing.odds) {
      if (!providerSelections.has(current.selection) && current.isActive) {
        await prisma.odd.update({
          where: { id: current.id },
          data: { isActive: false },
        });
        changed += 1;
      }
    }
  }

  // Mercados SPREADS_* velhos que o mapper novo não emite mais
  for (const existing of existingMarkets) {
    if (!existing.type.includes("SPREADS")) continue;
    if (providerTypes.has(existing.type)) continue;
    const deactivated = await prisma.odd.updateMany({
      where: { marketId: existing.id, isActive: true },
      data: { isActive: false },
    });
    changed += deactivated.count;
  }

  changed += await deactivateNonComplementarySpreadOdds(matchId);

  return changed;
}

/** True se ainda há odd ativa de handicap sem o complementar na mesma market. */
async function hasBrokenSpreadPairs(prefix: string): Promise<boolean> {
  const markets = await prisma.market.findMany({
    where: {
      type: { contains: "SPREADS" },
      match: { status: "SCHEDULED", externalId: { startsWith: prefix } },
    },
    include: { odds: { where: { isActive: true }, select: { selection: true } } },
  });

  for (const market of markets) {
    const homes: number[] = [];
    const aways: number[] = [];
    for (const odd of market.odds) {
      const parsed = /^(HOME|AWAY)_([+-]?[\d.]+)$/.exec(odd.selection);
      if (!parsed) continue;
      const point = Number(parsed[2]);
      if (!Number.isFinite(point)) continue;
      if (parsed[1] === "HOME") homes.push(point);
      else aways.push(point);
    }
    for (const homePoint of homes) {
      if (!aways.some((awayPoint) => Math.abs(awayPoint + homePoint) < 1e-9)) {
        return true;
      }
    }
    for (const awayPoint of aways) {
      if (!homes.some((homePoint) => Math.abs(awayPoint + homePoint) < 1e-9)) {
        return true;
      }
    }
  }

  return false;
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

  // 1) Preferência: Opta (placar HT/FT + escanteios + cartões + artílheiros).
  const optaMatch = await fetchOptaFinishedTargetMatch().catch(() => null);
  if (optaMatch) {
    for (const match of dueMatches) {
      if (!teamsMatchOpta(match.homeTeam, match.awayTeam, optaMatch.homeTeam, optaMatch.awayTeam)) {
        continue;
      }
      await settleMatchCore(match.id, optaMatch.context, "system:opta-auto");
      return;
    }
  }

  // 2) Fallback: placar final da The Odds API (sem stats extras).
  if (!provider.fetchFinishedScores) return;
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

  const needsSpreadRepair = await hasBrokenSpreadPairs(prefix);

  if (!hasFreshDbSnapshot || needsSpreadRepair) {
    if (needsSpreadRepair) invalidateOddsListCache();
    await importMatchesFromProvider(provider).catch((error) => {
      console.error("[matches-repository] Falha ao sincronizar provider:", error);
    });
  }

  // Sempre limpa pares inventados (mesmo se a API já não refrescar pós-kickoff).
  if (latestSynced) {
    const scheduled = await prisma.match.findMany({
      where: { status: "SCHEDULED", externalId: { startsWith: prefix } },
      select: { id: true },
    });
    for (const match of scheduled) {
      await deactivateNonComplementarySpreadOdds(match.id);
    }
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
  await deactivateNonComplementarySpreadOdds(matchId);
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
  const match = await prisma.match.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (match) await deactivateNonComplementarySpreadOdds(match.id);

  return prisma.match.findUnique({
    where: { slug },
    include: {
      markets: {
        include: { odds: { where: { isActive: true } } },
      },
    },
  });
}
