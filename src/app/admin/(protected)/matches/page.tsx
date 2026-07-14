import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { getAllMatches } from "@/features/admin/data/get-all-matches";
import { ImportMatchesButton } from "@/features/admin/components/import-matches-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · Partidas",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  LIVE: "Em andamento",
  FINISHED: "Finalizada",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSNAME: Record<string, string> = {
  SCHEDULED: "bg-primary/10 text-primary",
  LIVE: "bg-secondary text-secondary-foreground",
  FINISHED: "bg-success/10 text-success",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default async function AdminMatchesPage() {
  const matches = await getAllMatches();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Partidas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Importe partidas futuras, adicione manualmente ou finalize resultados.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/admin/matches/new">
              <PlusCircle className="h-4 w-4" />
              Nova partida
            </Link>
          </Button>
          <ImportMatchesButton />
        </div>
      </div>

      {matches.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Nenhuma partida cadastrada"
          description="Importe partidas da API ou crie uma partida manualmente."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Partida</th>
                <th className="px-4 py-3 font-medium">Liga</th>
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Placar</th>
                <th className="px-4 py-3 font-medium">Seleções</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {match.homeTeam} <span className="text-muted-foreground">x</span> {match.awayTeam}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{match.league}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormatter.format(new Date(match.startTime))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        STATUS_CLASSNAME[match.status]
                      )}
                    >
                      {STATUS_LABEL[match.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {match.homeScore !== null && match.awayScore !== null
                      ? `${match.homeScore} - ${match.awayScore}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{match._count.betSelections}</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/matches/${match.id}`}>Gerenciar</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
