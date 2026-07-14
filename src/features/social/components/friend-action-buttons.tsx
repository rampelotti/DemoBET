"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, UserMinus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
} from "@/features/social/actions/friend-actions";

interface FriendActionButtonsProps {
  targetUserId: string;
  friendshipState: "SELF" | "FRIENDS" | "PENDING_SENT" | "PENDING_RECEIVED" | "NONE";
  pendingFriendshipId?: string;
}

export function FriendActionButtons({
  targetUserId,
  friendshipState,
  pendingFriendshipId,
}: FriendActionButtonsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function run(action: () => Promise<{ success: boolean; message: string }>) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      setFeedback(result.message);
      if (result.success) router.refresh();
    });
  }

  if (friendshipState === "SELF") return null;

  return (
    <div className="flex flex-col gap-2">
      {friendshipState === "NONE" && (
        <Button size="sm" disabled={isPending} onClick={() => run(() => sendFriendRequest(targetUserId))}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Adicionar amigo
        </Button>
      )}

      {friendshipState === "PENDING_SENT" && (
        <Button size="sm" variant="outline" disabled>
          Solicitação enviada
        </Button>
      )}

      {friendshipState === "PENDING_RECEIVED" && pendingFriendshipId && (
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => run(() => respondToFriendRequest(pendingFriendshipId, true))}
          >
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => respondToFriendRequest(pendingFriendshipId, false))}
          >
            Recusar
          </Button>
        </div>
      )}

      {friendshipState === "FRIENDS" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => removeFriend(targetUserId))}
          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
          Remover amigo
        </Button>
      )}

      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
