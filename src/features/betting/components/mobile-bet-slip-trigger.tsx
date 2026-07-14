"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BetSlip } from "@/features/betting/components/bet-slip";
import { DEFAULT_STAKE, useBetSlipStore } from "@/store/bet-slip-store";

export function MobileBetSlipTrigger() {
  const [open, setOpen] = useState(false);
  const selections = useBetSlipStore((state) => state.selections);
  const stakes = useBetSlipStore((state) => state.stakes);

  if (selections.length === 0) {
    return null;
  }

  const matchIds = new Set(selections.map((selection) => selection.matchId));
  const totalStake = Array.from(matchIds).reduce((sum, matchId) => {
    const stake = stakes[matchId];
    return sum + (stake && stake > 0 ? stake : DEFAULT_STAKE);
  }, 0);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 xl:hidden">
      <Button size="lg" className="w-full justify-between" onClick={() => setOpen(true)}>
        <span className="flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          {selections.length} {selections.length === 1 ? "seleção" : "seleções"}
        </span>
        <span>{totalStake.toLocaleString("pt-BR")} Coins</span>
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex h-[85vh] flex-col">
          <SheetHeader>
            <SheetTitle>Cupom de apostas</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex-1 overflow-y-auto">
            <BetSlip />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
