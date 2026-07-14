"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { inviteToGroup } from "@/features/social/actions/group-actions";

interface GroupInvitePanelProps {
  groupId: string;
  friends: { id: string; name: string; username: string | null }[];
}

export function GroupInvitePanel({ groupId, friends }: GroupInvitePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Adicione amigos para poder convidá-los ao grupo.
      </p>
    );
  }

  function handleInvite(friendId: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await inviteToGroup(groupId, friendId);
      setFeedback(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {friends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">{friend.name}</p>
            <p className="text-xs text-muted-foreground">@{friend.username ?? "usuario"}</p>
          </div>
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleInvite(friend.id)}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Convidar"}
          </Button>
        </div>
      ))}
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
