"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createGroup } from "@/features/social/actions/group-actions";

export function CreateGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await createGroup(name);
      setFeedback(result.message);
      if (result.success) {
        setName("");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border/80 p-4">
      <p className="text-sm font-semibold text-foreground">Criar grupo privado</p>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do grupo"
          minLength={3}
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar
        </Button>
      </div>
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </form>
  );
}
