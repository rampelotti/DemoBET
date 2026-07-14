import Link from "next/link";

import type { UserBetWithSelections } from "@/features/betting/data/get-user-bets";
import { cn } from "@/lib/utils";

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

interface RecentPicksPanelProps {
  bets: UserBetWithSelections[];
}

/**
 * Versão compacta do histórico de apostas, para ficar ao lado do Cupom (ver
 * `(sportsbook)/layout.tsx`). A lista completa, com filtros por status, fica
 * em `/meus-palpites`.
 */
export function RecentPicksPanel({ bets }: RecentPicksPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Meus palpites</h2>
        <Link href="/meus-palpites" className="text-xs font-medium text-primary hover:underline">
          Ver tudo
        </Link>
      </div>

      {bets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Você ainda não fez nenhuma aposta. Clique em uma odd para começar.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {bets.map((bet) => (
            <Link
              key={bet.id}
              href="/meus-palpites"
              className="rounded-lg border border-border/80 p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    STATUS_CLASSNAME[bet.status]
                  )}
                >
                  {STATUS_LABEL[bet.status]}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {coinsFormatter.format(bet.stake)} Coins
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs text-muted-foreground">
                {bet.selections.map((selection) => selection.selectionLabel).join(" + ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
