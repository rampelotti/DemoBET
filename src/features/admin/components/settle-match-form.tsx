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
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message?: string } | null>(null);

  function handleSubmit() {
    setFeedback(null);
    startTransition(async () => {
      const result = await settleMatch(matchId, Number(homeScore), Number(awayScore));
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground">Finalizar partida</p>
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
        Isso resolve automaticamente as apostas pendentes ligadas a esta partida e credita os
        ganhadores.
      </p>
    </div>
  );
}
