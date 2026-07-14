import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, UserPlus, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { CompareFriendsPanel } from "@/features/social/components/compare-friends-panel";
import { RankingTable } from "@/features/social/components/ranking-table";
import { SocialNav } from "@/features/social/components/social-nav";
import { getFriends } from "@/features/social/data/friends";
import { getFriendsRanking, getPlatformRanking } from "@/features/social/data/rankings";
import { ensureUsername } from "@/lib/username";

export const metadata: Metadata = {
  title: "Fantasy Social",
};

export default async function SocialPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?callbackUrl=/social");

  await ensureUsername(currentUser.id);

  const [friends, platformRanking, friendsRanking] = await Promise.all([
    getFriends(currentUser.id),
    getPlatformRanking(5),
    getFriendsRanking(currentUser.id),
  ]);

  const me = friendsRanking.find((entry) => entry.id === currentUser.id);
  const friendEntries = friendsRanking.filter((entry) => entry.id !== currentUser.id);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Fantasy Social</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare estratégias, crie grupos e dispute o ranking com seus amigos.
        </p>
      </div>

      <SocialNav />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/80 card-interactive">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-semibold">{friends.length}</p>
              <p className="text-xs text-muted-foreground">Amigos</p>
            </div>
          </CardContent>
        </Card>
        <Link href="/social/ranking">
          <Card className="border-border/80 card-interactive h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Ranking geral</p>
                <p className="text-xs text-muted-foreground">Ver classificação</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/social/amigos">
          <Card className="border-border/80 card-interactive h-full">
            <CardContent className="flex items-center gap-3 p-4">
              <UserPlus className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Buscar amigos</p>
                <p className="text-xs text-muted-foreground">Encontrar apostadores</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {me && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Comparar com amigos</h2>
          <CompareFriendsPanel currentUser={me} friends={friendEntries} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Top da plataforma</h2>
        <RankingTable users={platformRanking} highlightUserId={currentUser.id} />
      </section>
    </div>
  );
}
