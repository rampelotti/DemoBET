import Link from "next/link";
import {
  Coins,
  Percent,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { BetHistoryItem } from "@/features/betting/components/bet-history-item";
import { StatCard } from "@/features/dashboard/components/stat-card";
import { FriendActionButtons } from "@/features/social/components/friend-action-buttons";
import type { PublicProfile } from "@/features/social/data/get-public-profile";

const coinsFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

interface PublicProfileViewProps {
  profile: PublicProfile;
  friendshipState: "SELF" | "FRIENDS" | "PENDING_SENT" | "PENDING_RECEIVED" | "NONE";
  pendingFriendshipId?: string;
}

export function PublicProfileView({
  profile,
  friendshipState,
  pendingFriendshipId,
}: PublicProfileViewProps) {
  const { user, stats, bets, canViewFullHistory } = profile;

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{user.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">@{user.username}</p>
        </div>
        {friendshipState !== "SELF" && (
          <FriendActionButtons
            targetUserId={user.id}
            friendshipState={friendshipState}
            pendingFriendshipId={pendingFriendshipId}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Saldo de Coins"
          value={coinsFormatter.format(stats.balance)}
          icon={Coins}
        />
        <StatCard
          label="ROI"
          value={`${percentFormatter.format(stats.roi)}%`}
          icon={stats.roi >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Lucro"
          value={`${stats.profit >= 0 ? "+" : ""}${coinsFormatter.format(stats.profit)} Coins`}
          icon={stats.profit >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="Taxa de acerto"
          value={`${percentFormatter.format(stats.winrate)}%`}
          icon={Percent}
        />
        <StatCard label="Apostas" value={`${stats.totalBets}`} icon={Users} />
        <StatCard
          label="Odd média"
          value={stats.avgOdd > 0 ? stats.avgOdd.toFixed(2) : "—"}
          icon={Target}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {canViewFullHistory ? "Histórico de apostas" : "Últimas apostas resolvidas"}
          </h2>
          {friendshipState === "SELF" && (
            <Link href="/meus-palpites" className="text-sm font-medium text-primary hover:underline">
              Ver tudo
            </Link>
          )}
        </div>

        {!canViewFullHistory && friendshipState !== "SELF" && friendshipState !== "FRIENDS" && (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Adicione como amigo para ver o histórico completo de apostas.
          </p>
        )}

        {bets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma aposta registrada ainda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {bets.map((bet) => (
              <BetHistoryItem key={bet.id} bet={bet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
