"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { respondToGroupInvite } from "@/features/social/actions/group-actions";

interface GroupInviteActionsProps {
  inviteId: string;
  groupName: string;
}

export function GroupInviteActions({ inviteId, groupName }: GroupInviteActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(accept: boolean) {
    startTransition(async () => {
      await respondToGroupInvite(inviteId, accept);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <p className="text-sm text-foreground">
        Convite para <span className="font-semibold">{groupName}</span>
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={isPending} onClick={() => respond(true)}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Aceitar"}
        </Button>
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => respond(false)}>
          Recusar
        </Button>
      </div>
    </div>
  );
}
