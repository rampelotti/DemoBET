"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { importMatchesAction } from "@/features/admin/actions/import-matches";
import { cn } from "@/lib/utils";

export function ImportMatchesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  function handleImport() {
    setFeedback(null);
    startTransition(async () => {
      const result = await importMatchesAction();
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" disabled={isPending} onClick={handleImport}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Importar partidas da API
      </Button>
      {feedback && (
        <p className={cn("text-xs", feedback.success ? "text-success" : "text-destructive")}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
