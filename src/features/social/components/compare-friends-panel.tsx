import Link from "next/link";
import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RankedUser } from "@/features/social/data/rankings";
import { cn } from "@/lib/utils";

const coinsFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

interface CompareFriendsPanelProps {
  currentUser: RankedUser;
  friends: RankedUser[];
}

const METRICS = [
  { key: "balance" as const, label: "Coins" },
  { key: "roi" as const, label: "ROI" },
  { key: "winrate" as const, label: "Winrate" },
  { key: "profit" as const, label: "Lucro" },
];

export function CompareFriendsPanel({ currentUser, friends }: CompareFriendsPanelProps) {
  if (friends.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Adicione amigos para comparar desempenho lado a lado.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {friends.slice(0, 5).map((friend) => (
        <Card key={friend.id} className="border-border/80 card-interactive">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">vs</p>
                {friend.username ? (
                  <Link href={`/u/${friend.username}`} className="text-sm font-semibold hover:text-primary">
                    {friend.name}
                  </Link>
                ) : (
                  <p className="text-sm font-semibold">{friend.name}</p>
                )}
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {METRICS.map((metric) => {
                const myValue = getMetricValue(currentUser, metric.key);
                const friendValue = getMetricValue(friend, metric.key);
                const iWin = myValue > friendValue;

                return (
                  <div
                    key={metric.key}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs"
                  >
                    <span className="text-muted-foreground">{metric.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-semibold", iWin && "text-success")}>
                        {formatMetric(metric.key, myValue)}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className={cn("font-semibold", !iWin && friendValue !== myValue && "text-primary")}>
                        {formatMetric(metric.key, friendValue)}
                      </span>
                      {myValue !== friendValue &&
                        (iWin ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-muted-foreground" />
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getMetricValue(user: RankedUser, key: (typeof METRICS)[number]["key"]) {
  if (key === "balance") return user.stats.balance;
  if (key === "roi") return user.stats.roi;
  if (key === "winrate") return user.stats.winrate;
  return user.stats.profit;
}

function formatMetric(key: (typeof METRICS)[number]["key"], value: number) {
  if (key === "balance" || key === "profit") {
    return `${value >= 0 && key === "profit" ? "+" : ""}${coinsFormatter.format(value)}`;
  }
  return `${percentFormatter.format(value)}%`;
}
