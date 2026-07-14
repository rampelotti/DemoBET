import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { RankingTable } from "@/features/social/components/ranking-table";
import { SocialNav } from "@/features/social/components/social-nav";
import { getFriendsRanking, getPlatformRanking } from "@/features/social/data/rankings";

export const metadata: Metadata = {
  title: "Ranking",
};

export default async function SocialRankingPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?callbackUrl=/social/ranking");

  const [platformRanking, friendsRanking] = await Promise.all([
    getPlatformRanking(20),
    getFriendsRanking(currentUser.id),
  ]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Rankings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Classificação por Coins, ROI, winrate e lucro.
        </p>
      </div>

      <SocialNav />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Ranking geral da plataforma</h2>
        <RankingTable users={platformRanking} highlightUserId={currentUser.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Ranking entre amigos</h2>
        <RankingTable users={friendsRanking} highlightUserId={currentUser.id} showBalance={false} />
      </section>
    </div>
  );
}
