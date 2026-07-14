"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cancelBet } from "@/features/betting/actions/cancel-bet";
import type { UserBetWithSelections } from "@/features/betting/data/get-user-bets";
import { canCancelBet } from "@/features/betting/lib/can-cancel-bet";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const coinsFormatter = new Intl.NumberFormat("pt-BR");

const STATUS_LABEL: Record<UserBetWithSelections["status"], string> = {
  OPEN: "Em aberto",
  WON: "Ganha",
  LOST: "Perdida",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSNAME: Record<UserBetWithSelections["status"], string> = {
  OPEN: "bg-primary/10 text-primary",
  WON: "bg-success/10 text-success",
  LOST: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

interface BetHistoryItemProps {
  bet: UserBetWithSelections;
}

export function BetHistoryItem({ bet }: BetHistoryItemProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const showCancelButton = canCancelBet(bet) && !feedback?.success;

  function handleCancel() {
    setFeedback(null);
    startTransition(async () => {
      const result = await cancelBet(bet.id);
      setFeedback(result);
      setConfirmCancel(false);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-border/80">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {dateFormatter.format(new Date(bet.placedAt))}
          </p>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              STATUS_CLASSNAME[bet.status]
            )}
          >
            {STATUS_LABEL[bet.status]}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {bet.selections.length > 1 && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Múltipla {bet.selections.length}x
            </span>
          )}
          {bet.selections.map((selection) => (
            <div key={selection.id} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">{selection.selectionLabel}</p>
                <p className="text-xs text-muted-foreground">{selection.marketLabel}</p>
              </div>
              <span className="rounded-lg bg-muted px-2 py-1 text-sm font-semibold text-foreground">
                {selection.oddValue.toFixed(2)}
              </span>
            </div>
          ))}
          {bet.selections.length > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Odd combinada</span>
              <span className="font-semibold text-primary">
                {bet.selections
                  .reduce((product, selection) => product * selection.oddValue, 1)
                  .toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Aposta</p>
            <p className="font-semibold text-foreground">
              {coinsFormatter.format(bet.stake)} Coins
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {bet.status === "WON" ? "Retorno" : "Retorno potencial"}
            </p>
            <p
              className={cn(
                "font-semibold",
                bet.status === "WON" && "text-success",
                bet.status === "LOST" && "text-muted-foreground line-through"
              )}
            >
              {coinsFormatter.format(bet.actualReturn ?? bet.potentialReturn)} Coins
            </p>
          </div>
        </div>

        {feedback && (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-xs",
              feedback.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {feedback.message}
          </p>
        )}

        {showCancelButton && !confirmCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => setConfirmCancel(true)}
            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Encerrar aposta
          </Button>
        )}

        {showCancelButton && confirmCancel && (
          <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs text-muted-foreground">
              Tem certeza? Você recebe de volta{" "}
              <span className="font-semibold text-foreground">
                {coinsFormatter.format(bet.stake)} Coins
              </span>
              . Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={isPending}
                onClick={() => setConfirmCancel(false)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isPending}
                onClick={handleCancel}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Confirmar encerramento"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
