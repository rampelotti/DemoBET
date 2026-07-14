"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { importOddsApiMatch } from "@/features/admin/actions/import-odds-api-match";
import { cn } from "@/lib/utils";

export function ImportOddsApiMatchButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  function handleImport() {
    setFeedback(null);
    startTransition(async () => {
      const result = await importOddsApiMatch();
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={isPending} onClick={handleImport} className="w-fit">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Importar essa partida para apostar
      </Button>
      {feedback && (
        <p className={cn("text-xs", feedback.success ? "text-success" : "text-destructive")}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
