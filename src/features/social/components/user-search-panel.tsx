"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchUsersAction } from "@/features/social/actions/search-users";
import { FriendActionButtons } from "@/features/social/components/friend-action-buttons";

interface UserSearchPanelProps {
  currentUserId: string;
}

export function UserSearchPanel({ currentUserId }: UserSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchUsersAction>>>([]);
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const users = await searchUsersAction(query, currentUserId);
      setResults(users);
      setSearched(true);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou @username"
            className="pl-9"
            minLength={2}
          />
        </div>
        <Button type="submit" disabled={isPending || query.trim().length < 2}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border/80 p-3 card-interactive"
          >
            <div className="min-w-0">
              {user.username ? (
                <Link href={`/u/${user.username}`} className="text-sm font-semibold hover:text-primary">
                  {user.name}
                </Link>
              ) : (
                <p className="text-sm font-semibold">{user.name}</p>
              )}
              <p className="text-xs text-muted-foreground">@{user.username ?? "usuario"}</p>
            </div>
            <FriendActionButtons
              targetUserId={user.id}
              friendshipState={user.relation}
              pendingFriendshipId={user.friendshipId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
