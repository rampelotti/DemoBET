import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { FriendActionButtons } from "@/features/social/components/friend-action-buttons";
import { SocialNav } from "@/features/social/components/social-nav";
import { UserSearchPanel } from "@/features/social/components/user-search-panel";
import {
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
} from "@/features/social/data/friends";

export const metadata: Metadata = {
  title: "Amigos",
};

export default async function SocialFriendsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?callbackUrl=/social/amigos");

  const [friends, incoming, outgoing] = await Promise.all([
    getFriends(currentUser.id),
    getPendingFriendRequests(currentUser.id),
    getSentFriendRequests(currentUser.id),
  ]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Amigos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busque apostadores, envie solicitações e acompanhe seus amigos.
        </p>
      </div>

      <SocialNav />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Buscar usuários</h2>
        <UserSearchPanel currentUserId={currentUser.id} />
      </section>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Solicitações recebidas</h2>
          <div className="flex flex-col gap-2">
            {incoming.map((request) => (
              <Card key={request.id} className="border-border/80">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    {request.requester.username ? (
                      <Link
                        href={`/u/${request.requester.username}`}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {request.requester.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold">{request.requester.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      @{request.requester.username ?? "usuario"}
                    </p>
                  </div>
                  <FriendActionButtons
                    targetUserId={request.requester.id}
                    friendshipState="PENDING_RECEIVED"
                    pendingFriendshipId={request.id}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Solicitações enviadas</h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((request) => (
              <Card key={request.id} className="border-border/80">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="text-sm font-medium">{request.addressee.name}</p>
                  <span className="text-xs text-muted-foreground">Aguardando resposta</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-foreground">Meus amigos ({friends.length})</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não tem amigos adicionados.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {friends.map((friend) => (
              <Card key={friend.id} className="border-border/80 card-interactive">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    {friend.username ? (
                      <Link
                        href={`/u/${friend.username}`}
                        className="text-sm font-semibold hover:text-primary"
                      >
                        {friend.name}
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold">{friend.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {(friend.wallet?.balance ?? 0).toLocaleString("pt-BR")} Coins
                    </p>
                  </div>
                  <FriendActionButtons targetUserId={friend.id} friendshipState="FRIENDS" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
