"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Layers, Loader2, Ticket, X } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { placeBet } from "@/features/betting/actions/place-bet";
import { trackPlaceBet } from "@/lib/analytics/gtm";
import { DEFAULT_STAKE, useBetSlipStore, type BetSlipSelection } from "@/store/bet-slip-store";
import { cn } from "@/lib/utils";

const coinsFormatter = new Intl.NumberFormat("pt-BR");

interface BetGroup {
  matchId: string;
  matchLabel: string;
  selections: BetSlipSelection[];
  combinedOdd: number;
}

function groupSelectionsByMatch(selections: BetSlipSelection[]): BetGroup[] {
  const groups = new Map<string, BetGroup>();

  for (const selection of selections) {
    const existing = groups.get(selection.matchId);
    if (existing) {
      existing.selections.push(selection);
      existing.combinedOdd *= selection.oddValue;
    } else {
      groups.set(selection.matchId, {
        matchId: selection.matchId,
        matchLabel: selection.matchLabel,
        selections: [selection],
        combinedOdd: selection.oddValue,
      });
    }
  }

  return Array.from(groups.values());
}

export function BetSlip() {
  const router = useRouter();
  const selections = useBetSlipStore((state) => state.selections);
  const stakes = useBetSlipStore((state) => state.stakes);
  const removeSelection = useBetSlipStore((state) => state.removeSelection);
  const setStake = useBetSlipStore((state) => state.setStake);
  const clear = useBetSlipStore((state) => state.clear);

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (selections.length === 0) {
    return (
      <EmptyState
        icon={Ticket}
        title="Seu cupom está vazio"
        description="Clique em uma odd para adicionar uma seleção. Escolha mais de uma odd da mesma partida para criar uma aposta múltipla."
        className="border-none bg-transparent p-6"
      />
    );
  }

  const groups = groupSelectionsByMatch(selections);

  const totalStake = groups.reduce((sum, group) => {
    const stake = stakes[group.matchId];
    return sum + (stake && stake > 0 ? stake : DEFAULT_STAKE);
  }, 0);
  const totalPotentialReturn = groups.reduce((sum, group) => {
    const stake = stakes[group.matchId];
    const effectiveStake = stake && stake > 0 ? stake : DEFAULT_STAKE;
    return sum + Math.floor(effectiveStake * group.combinedOdd);
  }, 0);

  function handleConfirm() {
    setFeedback(null);
    startTransition(async () => {
      const result = await placeBet(
        groups.map((group) => {
          const stake = stakes[group.matchId];
          return {
            stake: stake && stake > 0 ? stake : DEFAULT_STAKE,
            selections: group.selections.map((selection) => ({
              oddId: selection.oddId,
              matchId: selection.matchId,
              marketLabel: selection.marketLabel,
              selectionLabel: selection.selectionLabel,
              oddValue: selection.oddValue,
            })),
          };
        })
      );

      setFeedback(result);
      if (result.success) {
        trackPlaceBet({
          selectionsCount: selections.length,
          totalStake,
          groupCount: groups.length,
        });
        clear();
        router.refresh();
      }
    });
  }

  return (
    // Flui normalmente (sem h-full/flex-1 interno): quem controla o scroll é
    // o container pai (sidebar no desktop com `overflow-y-auto`, ou o Sheet
    // no mobile — ver `mobile-bet-slip-trigger.tsx`). Ter dois níveis de
    // "flex-1 + overflow-y-auto" aninhados sem altura definida no meio (o
    // card "Cupom de apostas") era o que fazia o rodapé (Confirmar aposta)
    // ficar com altura errada e sobrepor o que vinha depois na sidebar.
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {groups.map((group) => {
          const stake =
            stakes[group.matchId] && stakes[group.matchId]! > 0
              ? stakes[group.matchId]!
              : DEFAULT_STAKE;
          const potentialReturn = Math.floor(stake * group.combinedOdd);
          const isMultiple = group.selections.length > 1;

          return (
            <div
              key={group.matchId}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-3",
                isMultiple ? "border-primary/50 bg-primary/5" : "border-border"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground">{group.matchLabel}</p>
                  {isMultiple && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      <Layers className="h-2.5 w-2.5" />
                      Múltipla {group.selections.length}x
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {group.selections.map((selection) => (
                  <div key={selection.oddId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {selection.selectionLabel}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{selection.marketLabel}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-lg bg-muted px-2 py-1 text-sm font-semibold text-foreground">
                        {selection.oddValue.toFixed(2)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSelection(selection.oddId)}
                        aria-label="Remover seleção"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {isMultiple && (
                <div className="flex items-center justify-between border-t border-primary/20 pt-1.5 text-xs">
                  <span className="text-muted-foreground">Odd combinada</span>
                  <span className="font-semibold text-primary">{group.combinedOdd.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground" htmlFor={`stake-${group.matchId}`}>
                    Coins
                  </label>
                  <Input
                    id={`stake-${group.matchId}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder={String(DEFAULT_STAKE)}
                    value={
                      stakes[group.matchId] === undefined
                        ? String(DEFAULT_STAKE)
                        : stakes[group.matchId] === 0
                          ? ""
                          : String(stakes[group.matchId])
                    }
                    onChange={(event) => {
                      const digits = event.target.value.replace(/\D/g, "");
                      if (digits === "") {
                        setStake(group.matchId, 0);
                        return;
                      }
                      const next = Number.parseInt(digits, 10);
                      if (Number.isFinite(next)) {
                        setStake(group.matchId, next);
                      }
                    }}
                    onBlur={() => {
                      // Se ficou vazio ao sair, volta para o stake padrão.
                      if (!stakes[group.matchId]) {
                        setStake(group.matchId, DEFAULT_STAKE);
                      }
                    }}
                    className="h-9"
                  />
                </div>
                <div className="flex-1 text-right">
                  <p className="text-xs text-muted-foreground">Retorno potencial</p>
                  <p className="text-sm font-semibold text-foreground">
                    {coinsFormatter.format(potentialReturn)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total investido</span>
          <span className="font-semibold text-foreground">
            {coinsFormatter.format(totalStake)} Coins
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Retorno potencial</span>
          <span className="font-semibold text-success">
            {coinsFormatter.format(totalPotentialReturn)} Coins
          </span>
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

        <Button size="lg" disabled={isPending} onClick={handleConfirm}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar aposta"}
        </Button>
      </div>
    </div>
  );
}
