import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MarketOddsRow } from "@/features/betting/components/market-odds-row";
import { TeamCrest } from "@/features/betting/components/team-crest";
import type { MatchWithMarkets } from "@/features/betting/types";

interface MatchCardProps {
  match: MatchWithMarkets;
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function MatchCard({ match }: MatchCardProps) {
  // Como nas casas de apostas reais: o card mostra só o mercado principal.
  // Os demais mercados ficam na página da partida (clicando no confronto).
  const primaryMarket =
    match.markets.find((market) => market.type === "MATCH_WINNER") ?? match.markets[0];
  const extraMarketsCount = match.markets.length - (primaryMarket ? 1 : 0);
  const matchHref = `/jogos/${match.slug ?? match.id}`;

  return (
    <Card className="border-border/80 card-interactive">
      <CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-3">
        <Link href={matchHref} className="min-w-0 group">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {match.leagueLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={match.leagueLogoUrl} alt="" className="h-3.5 w-3.5 object-contain" />
            )}
            <span>{match.league}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <TeamCrest src={match.homeCrestUrl} teamName={match.homeTeam} size={22} />
            <p className="text-sm font-semibold text-foreground group-hover:text-primary">
              {match.homeTeam} <span className="text-muted-foreground">x</span> {match.awayTeam}
            </p>
            <TeamCrest src={match.awayCrestUrl} teamName={match.awayTeam} size={22} />
          </div>
        </Link>
        <span className="whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {timeFormatter.format(new Date(match.startTime))}
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 p-4 pt-0">
        {primaryMarket && <MarketOddsRow match={match} market={primaryMarket} />}

        <Link
          href={matchHref}
          className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-border py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {extraMarketsCount > 0
            ? `Ver todos os mercados (+${extraMarketsCount})`
            : "Ver detalhes da partida"}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
