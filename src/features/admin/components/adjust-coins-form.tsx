"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustCoins } from "@/features/admin/actions/adjust-coins";
import { cn } from "@/lib/utils";

interface AdjustCoinsFormProps {
  userId: string;
}

export function AdjustCoinsForm({ userId }: AdjustCoinsFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("1000");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message?: string } | null>(null);

  function runAction(action: "CREDIT" | "DEBIT" | "RESET") {
    setFeedback(null);
    startTransition(async () => {
      const result = await adjustCoins(userId, action, Number(amount));
      setFeedback(result);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="h-8 w-24"
          disabled={isPending}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction("CREDIT")}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Creditar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => runAction("DEBIT")}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Minus className="h-3.5 w-3.5" />}
          Debitar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => runAction("RESET")}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Resetar p/ 10.000
        </Button>
      </div>

      {feedback && (
        <p
          className={cn(
            "text-xs",
            feedback.success ? "text-success" : "text-destructive"
          )}
        >
          {feedback.success ? "Saldo atualizado." : feedback.message}
        </p>
      )}
    </div>
  );
}
