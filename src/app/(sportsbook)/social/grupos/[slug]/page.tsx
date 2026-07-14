import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { GroupInvitePanel } from "@/features/social/components/group-invite-panel";
import { RankingTable } from "@/features/social/components/ranking-table";
import { SocialNav } from "@/features/social/components/social-nav";
import { getFriends } from "@/features/social/data/friends";
import { getGroupBySlug } from "@/features/social/data/groups";
import { getGroupRanking } from "@/features/social/data/rankings";

interface GroupPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getGroupBySlug(slug);
  return { title: data?.group.name ?? "Grupo" };
}

export default async function GroupDetailPage({ params }: GroupPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(`/login?callbackUrl=/social/grupos/${(await params).slug}`);

  const { slug } = await params;
  const data = await getGroupBySlug(slug, currentUser.id);
  if (!data) notFound();

  const { group, isMember } = data;
  if (!isMember) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        <p className="text-sm text-muted-foreground">
          Este é um grupo privado. Peça um convite ao dono para participar.
        </p>
      </div>
    );
  }

  const [ranking, friends] = await Promise.all([
    getGroupRanking(group.id),
    getFriends(currentUser.id),
  ]);

  const memberIds = new Set(group.members.map((member) => member.userId));
  const friendsToInvite = friends.filter((friend) => !memberIds.has(friend.id));

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{group.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {group._count.members} membros · Ranking interno por lucro, ROI e winrate
        </p>
      </div>

      <SocialNav />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Ranking do grupo</h2>
        <RankingTable users={ranking} highlightUserId={currentUser.id} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Convidar amigos</h2>
        <GroupInvitePanel groupId={group.id} friends={friendsToInvite} />
      </section>
    </div>
  );
}
