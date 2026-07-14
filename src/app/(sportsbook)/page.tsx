import type { Metadata } from "next";
import { CalendarX, SearchX } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { getUpcomingMatches } from "@/features/betting/data/matches-repository";
import { GuestHero } from "@/features/betting/components/guest-hero";
import { MatchCard } from "@/features/betting/components/match-card";
import { SocialPromoBanner } from "@/features/social/components/social-promo-banner";
import { SPORT_NAV_ITEMS } from "@/features/betting/data/sports-nav";
import type { MatchWithMarkets } from "@/features/betting/types";

export const metadata: Metadata = {
  title: "Partidas em destaque",
};

interface HomePageProps {
  searchParams: Promise<{ sport?: string; when?: "hoje" | "amanha" | "semana"; q?: string }>;
}

function isWithinWindow(startTime: Date, when?: string) {
  if (!when) return true;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  if (when === "hoje") {
    end.setDate(end.getDate() + 1);
  } else if (when === "amanha") {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 2);
  } else if (when === "semana") {
    end.setDate(end.getDate() + 7);
  }

  return startTime >= start && startTime < end;
}

function groupByLeague(matches: MatchWithMarkets[]) {
  const groups = new Map<string, MatchWithMarkets[]>();
  for (const match of matches) {
    const list = groups.get(match.league) ?? [];
    list.push(match);
    groups.set(match.league, list);
  }
  return Array.from(groups.entries());
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { sport, when, q } = await searchParams;
  const searchTerm = q?.trim();

  const [currentUser, matches] = await Promise.all([
    getCurrentUser(),
    getUpcomingMatches(sport, searchTerm),
  ]);
  const filteredMatches = matches.filter((match) => isWithinWindow(match.startTime, when));
  const groupedMatches = groupByLeague(filteredMatches);

  const activeSportLabel = SPORT_NAV_ITEMS.find((item) => item.sport === sport)?.label;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {!currentUser && <GuestHero />}

      <SocialPromoBanner isLoggedIn={Boolean(currentUser)} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {searchTerm ? `Resultados para "${searchTerm}"` : activeSportLabel ?? "Partidas em destaque"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Escolha uma odd para adicionar ao seu cupom. Tudo em Coins, sem dinheiro real.
        </p>
      </div>

      {groupedMatches.length === 0 ? (
        <EmptyState
          icon={searchTerm ? SearchX : CalendarX}
          title="Nenhuma partida encontrada"
          description={
            searchTerm
              ? `Não encontramos nenhuma partida ou liga com "${searchTerm}". Tente outro termo.`
              : "Não há partidas futuras para esse filtro no momento. Tente outro esporte ou período."
          }
        />
      ) : (
        groupedMatches.map(([league, leagueMatches]) => (
          <div key={league} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">{league}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {leagueMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
