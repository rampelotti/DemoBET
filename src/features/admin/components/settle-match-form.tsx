"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settleMatch } from "@/features/admin/actions/settle-match";
import { cn } from "@/lib/utils";

interface SettleMatchFormProps {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
}

export function SettleMatchForm({ matchId, homeTeam, awayTeam }: SettleMatchFormProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [homeScoreHt, setHomeScoreHt] = useState("");
  const [awayScoreHt, setAwayScoreHt] = useState("");
  const [homeCorners, setHomeCorners] = useState("");
  const [awayCorners, setAwayCorners] = useState("");
  const [homeCards, setHomeCards] = useState("");
  const [awayCards, setAwayCards] = useState("");
  const [goalScorersText, setGoalScorersText] = useState("");
  const [firstScorerText, setFirstScorerText] = useState("");
  const [lastScorerText, setLastScorerText] = useState("");
  const [cardedPlayersText, setCardedPlayersText] = useState("");
  const [redCardPlayersText, setRedCardPlayersText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message?: string } | null>(null);

  function optionalNumber(value: string): number | undefined {
    if (value.trim() === "") return undefined;
    return Number(value);
  }

  function handleSubmit() {
    setFeedback(null);
    startTransition(async () => {
      const result = await settleMatch(matchId, {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
        homeScoreHt: optionalNumber(homeScoreHt),
        awayScoreHt: optionalNumber(awayScoreHt),
        homeCorners: optionalNumber(homeCorners),
        awayCorners: optionalNumber(awayCorners),
        homeCards: optionalNumber(homeCards),
        awayCards: optionalNumber(awayCards),
        goalScorersText,
        firstScorerText,
        lastScorerText,
        cardedPlayersText,
        redCardPlayersText,
      });
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Finalizar partida</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Placar final é obrigatório. Preencha HT, escanteios, cartões e artílheiros para liquidar
          esses mercados; campos vazios → esses mercados são estornados (VOID).
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Placar final
        </p>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="homeScore">{homeTeam}</Label>
            <Input
              id="homeScore"
              type="number"
              min={0}
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
              className="w-20"
            />
          </div>
          <span className="mt-5 text-muted-foreground">x</span>
          <div className="flex flex-col gap-1">
            <Label htmlFor="awayScore">{awayTeam}</Label>
            <Input
              id="awayScore"
              type="number"
              min={0}
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
              className="w-20"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1º tempo (opcional)
        </p>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="homeScoreHt">{homeTeam} HT</Label>
            <Input
              id="homeScoreHt"
              type="number"
              min={0}
              value={homeScoreHt}
              onChange={(event) => setHomeScoreHt(event.target.value)}
              className="w-20"
              placeholder="—"
            />
          </div>
          <span className="mt-5 text-muted-foreground">x</span>
          <div className="flex flex-col gap-1">
            <Label htmlFor="awayScoreHt">{awayTeam} HT</Label>
            <Input
              id="awayScoreHt"
              type="number"
              min={0}
              value={awayScoreHt}
              onChange={(event) => setAwayScoreHt(event.target.value)}
              className="w-20"
              placeholder="—"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Escanteios (opcional)
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="homeCorners">{homeTeam}</Label>
              <Input
                id="homeCorners"
                type="number"
                min={0}
                value={homeCorners}
                onChange={(event) => setHomeCorners(event.target.value)}
                className="w-20"
                placeholder="—"
              />
            </div>
            <span className="mt-5 text-muted-foreground">x</span>
            <div className="flex flex-col gap-1">
              <Label htmlFor="awayCorners">{awayTeam}</Label>
              <Input
                id="awayCorners"
                type="number"
                min={0}
                value={awayCorners}
                onChange={(event) => setAwayCorners(event.target.value)}
                className="w-20"
                placeholder="—"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cartões (opcional)
          </p>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="homeCards">{homeTeam}</Label>
              <Input
                id="homeCards"
                type="number"
                min={0}
                value={homeCards}
                onChange={(event) => setHomeCards(event.target.value)}
                className="w-20"
                placeholder="—"
              />
            </div>
            <span className="mt-5 text-muted-foreground">x</span>
            <div className="flex flex-col gap-1">
              <Label htmlFor="awayCards">{awayTeam}</Label>
              <Input
                id="awayCards"
                type="number"
                min={0}
                value={awayCards}
                onChange={(event) => setAwayCards(event.target.value)}
                className="w-20"
                placeholder="—"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Jogadores (opcional)
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label htmlFor="goalScorers">Marcadores (vírgula)</Label>
            <Input
              id="goalScorers"
              value={goalScorersText}
              onChange={(event) => setGoalScorersText(event.target.value)}
              placeholder="Mbappé, Yamal"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="firstScorer">Primeiro a marcar</Label>
            <Input
              id="firstScorer"
              value={firstScorerText}
              onChange={(event) => setFirstScorerText(event.target.value)}
              placeholder="Mbappé"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="lastScorer">Último a marcar</Label>
            <Input
              id="lastScorer"
              value={lastScorerText}
              onChange={(event) => setLastScorerText(event.target.value)}
              placeholder="Yamal"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="cardedPlayers">Receberam cartão (vírgula)</Label>
            <Input
              id="cardedPlayers"
              value={cardedPlayersText}
              onChange={(event) => setCardedPlayersText(event.target.value)}
              placeholder="Jogador A, Jogador B"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="redCards">Cartão vermelho (vírgula)</Label>
            <Input
              id="redCards"
              value={redCardPlayersText}
              onChange={(event) => setRedCardPlayersText(event.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
      </section>

      {feedback && !feedback.success && (
        <p className="text-sm text-destructive">{feedback.message}</p>
      )}

      <Button disabled={isPending} onClick={handleSubmit} className="w-fit">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Confirmar resultado e liquidar apostas
      </Button>

      <p className={cn("text-xs text-muted-foreground")}>
        Handicap de gols e mercados de placar final liquidam só com o placar. Demais mercados
        precisam dos campos opcionais correspondentes.
      </p>
    </div>
  );
}
