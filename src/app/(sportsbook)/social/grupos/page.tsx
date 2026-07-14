import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { CreateGroupForm } from "@/features/social/components/create-group-form";
import { GroupInviteActions } from "@/features/social/components/group-invite-actions";
import { SocialNav } from "@/features/social/components/social-nav";
import { getPendingGroupInvites, getUserGroups } from "@/features/social/data/groups";

export const metadata: Metadata = {
  title: "Grupos",
};

export default async function SocialGroupsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?callbackUrl=/social/grupos");

  const [groups, invites] = await Promise.all([
    getUserGroups(currentUser.id),
    getPendingGroupInvites(currentUser.id),
  ]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Grupos privados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Crie grupos, convide amigos e dispute o ranking interno.
        </p>
      </div>

      <SocialNav />

      {invites.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">Convites pendentes</h2>
          {invites.map((invite) => (
            <GroupInviteActions
              key={invite.id}
              inviteId={invite.id}
              groupName={invite.group.name}
            />
          ))}
        </section>
      )}

      <CreateGroupForm />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Meus grupos ({groups.length})</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não participa de nenhum grupo.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <Link key={group.id} href={`/social/grupos/${group.slug}`}>
                <Card className="border-border/80 card-interactive h-full">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{group.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.memberCount} membros · {group.role === "OWNER" ? "Dono" : "Membro"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
