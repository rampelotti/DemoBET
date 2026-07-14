import Link from "next/link";
import { History as HistoryIcon } from "lucide-react";
import type { BetStatus } from "@prisma/client";

import { EmptyState } from "@/components/shared/empty-state";
import { BetHistoryItem } from "@/features/betting/components/bet-history-item";
import type { UserBetWithSelections } from "@/features/betting/data/get-user-bets";
import { cn } from "@/lib/utils";

const STATUS_TABS: { label: string; status?: BetStatus }[] = [
  { label: "Todas" },
  { label: "Abertas", status: "OPEN" },
  { label: "Ganhas", status: "WON" },
  { label: "Perdidas", status: "LOST" },
  { label: "Canceladas", status: "CANCELLED" },
];

interface BetsHistoryViewProps {
  bets: UserBetWithSelections[];
  activeStatus?: BetStatus;
  basePath: string;
}

export function BetsHistoryView({ bets, activeStatus, basePath }: BetsHistoryViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.status;
          const href = tab.status ? `${basePath}?status=${tab.status}` : basePath;

          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {bets.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Nenhuma aposta encontrada"
          description="Você ainda não fez apostas nessa categoria. Volte para a página inicial e escolha uma odd para começar."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bets.map((bet) => (
            <BetHistoryItem key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </div>
  );
}
