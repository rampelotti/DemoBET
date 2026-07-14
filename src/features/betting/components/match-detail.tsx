import { Layers } from "lucide-react";

import { MatchMarketsTabs } from "@/features/betting/components/match-markets-tabs";
import { TeamCrest } from "@/features/betting/components/team-crest";
import type { MatchWithMarkets } from "@/features/betting/types";

interface MatchDetailProps {
  match: MatchWithMarkets;
}

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function MatchDetail({ match }: MatchDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {match.leagueLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={match.leagueLogoUrl} alt="" className="h-4 w-4 object-contain" />
          )}
          <span>{match.league}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <TeamCrest src={match.homeCrestUrl} teamName={match.homeTeam} size={36} />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {match.homeTeam} <span className="text-muted-foreground">x</span> {match.awayTeam}
          </h1>
          <TeamCrest src={match.awayCrestUrl} teamName={match.awayTeam} size={36} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {dateTimeFormatter.format(new Date(match.startTime))}
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
        <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          <span className="font-semibold">Crie sua aposta:</span> escolha odds de mais de um mercado
          desta partida para combiná-las em uma única aposta múltipla, com odd combinada, no seu cupom.
        </p>
      </div>

      <MatchMarketsTabs match={match} />
    </div>
  );
}
