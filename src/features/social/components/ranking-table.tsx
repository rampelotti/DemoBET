import Link from "next/link";
import { Medal, TrendingUp, Trophy } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RankedUser } from "@/features/social/data/rankings";
import { cn } from "@/lib/utils";

const coinsFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

interface RankingTableProps {
  users: RankedUser[];
  highlightUserId?: string;
  showBalance?: boolean;
}

export function RankingTable({ users, highlightUserId, showBalance = true }: RankingTableProps) {
  if (users.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Nenhum participante no ranking ainda.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {users.map((entry, index) => {
        const position = index + 1;
        const isHighlighted = entry.id === highlightUserId;

        return (
          <Card
            key={entry.id}
            className={cn(
              "border-border/80 card-interactive",
              isHighlighted && "border-primary/40 bg-primary/5"
            )}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  position === 1 && "bg-amber-100 text-amber-700",
                  position === 2 && "bg-slate-100 text-slate-600",
                  position === 3 && "bg-orange-100 text-orange-700",
                  position > 3 && "bg-muted text-muted-foreground"
                )}
              >
                {position <= 3 ? <Medal className="h-4 w-4" /> : position}
              </div>

              <div className="min-w-0 flex-1">
                {entry.username ? (
                  <Link
                    href={`/u/${entry.username}`}
                    className="truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {entry.name}
                  </Link>
                ) : (
                  <p className="truncate text-sm font-semibold text-foreground">{entry.name}</p>
                )}
                <p className="text-xs text-muted-foreground">@{entry.username ?? "usuario"}</p>
              </div>

              <div className="hidden gap-4 text-right sm:flex">
                {showBalance && (
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground">Coins</p>
                    <p className="text-sm font-semibold">{coinsFormatter.format(entry.stats.balance)}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">ROI</p>
                  <p className="flex items-center justify-end gap-1 text-sm font-semibold">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    {percentFormatter.format(entry.stats.roi)}%
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Winrate</p>
                  <p className="text-sm font-semibold">{percentFormatter.format(entry.stats.winrate)}%</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground">Lucro</p>
                  <p className="text-sm font-semibold text-success">
                    {entry.stats.profit >= 0 ? "+" : ""}
                    {coinsFormatter.format(entry.stats.profit)}
                  </p>
                </div>
              </div>

              <Trophy className="h-4 w-4 shrink-0 text-muted-foreground/50 sm:hidden" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
