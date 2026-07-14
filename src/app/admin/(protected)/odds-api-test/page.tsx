import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ImportOddsApiMatchButton } from "@/features/admin/components/import-odds-api-match-button";
import { oddsApiProvider } from "@/lib/providers/odds-api-provider";

export const metadata: Metadata = {
  title: "Admin · Teste The Odds API",
};

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminOddsApiTestPage() {
  let matches: Awaited<ReturnType<typeof oddsApiProvider.listUpcomingMatches>> = [];
  let error: string | null = null;

  try {
    matches = await oddsApiProvider.listUpcomingMatches();
  } catch (caughtError) {
    error = caughtError instanceof Error ? caughtError.message : "Erro desconhecido.";
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Teste: The Odds API
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca a semifinal França x Espanha (Copa do Mundo) direto na The
          Odds API — mercados &quot;Resultado final&quot; e &quot;Total de
          gols&quot;. Essa é a mesma partida exibida na Home (que a importa
          automaticamente); use o botão abaixo só para forçar uma
          reimportação manual.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Falha ao chamar a API</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Partida não encontrada"
          description="A API respondeu normalmente, mas a semifinal França x Espanha não está disponível agora (pode ainda não ter sido anunciada ou já ter sido finalizada)."
        />
      ) : (
        matches.map((match) => (
          <div
            key={match.externalId}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4"
          >
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              Integração funcionando — dados reais recebidos da The Odds API.
            </div>

            <ImportOddsApiMatchButton />

            <div>
              <p className="text-xs text-muted-foreground">{match.league}</p>
              <p className="text-lg font-semibold text-foreground">
                {match.homeTeam} <span className="text-muted-foreground">x</span> {match.awayTeam}
              </p>
              <p className="text-xs text-muted-foreground">
                Início: {dateTimeFormatter.format(match.startTime)}
              </p>
            </div>

            {match.markets.map((market) => (
              <div key={market.type} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-foreground">{market.label}</p>
                <div className="flex flex-wrap gap-2">
                  {market.odds.map((odd) => (
                    <span
                      key={odd.selection}
                      className="rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground"
                    >
                      {odd.label}:{" "}
                      <span className="font-semibold text-foreground">{odd.value.toFixed(2)}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
