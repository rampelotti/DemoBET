"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMatch } from "@/features/admin/actions/create-match";
import { SPORT_NAV_ITEMS } from "@/features/betting/data/sports-nav";
import { cn } from "@/lib/utils";

export function CreateMatchForm() {
  const router = useRouter();
  const [hasDraw, setHasDraw] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSports = SPORT_NAV_ITEMS.filter((item) => !item.comingSoon);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const result = await createMatch({
      sport: String(formData.get("sport") ?? ""),
      league: String(formData.get("league") ?? ""),
      homeTeam: String(formData.get("homeTeam") ?? ""),
      awayTeam: String(formData.get("awayTeam") ?? ""),
      startTime: String(formData.get("startTime") ?? ""),
      hasDraw,
      homeOdd: Number(formData.get("homeOdd")),
      drawOdd: hasDraw ? Number(formData.get("drawOdd")) : undefined,
      awayOdd: Number(formData.get("awayOdd")),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.message ?? "Não foi possível criar a partida.");
      return;
    }

    router.push("/admin/matches");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-2xl border border-border bg-background p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sport">Esporte</Label>
          <select
            id="sport"
            name="sport"
            required
            defaultValue={availableSports[0]?.sport}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            {availableSports.map((item) => (
              <option key={item.sport} value={item.sport}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="league">Liga</Label>
          <Input id="league" name="league" placeholder="Ex.: Brasileirão Série A" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="homeTeam">Time da casa</Label>
          <Input id="homeTeam" name="homeTeam" placeholder="Ex.: Flamengo" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="awayTeam">Time visitante</Label>
          <Input id="awayTeam" name="awayTeam" placeholder="Ex.: Palmeiras" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="startTime">Início</Label>
          <Input id="startTime" name="startTime" type="datetime-local" required />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="hasDraw"
          type="checkbox"
          checked={hasDraw}
          onChange={(event) => setHasDraw(event.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="hasDraw" className="font-normal">
          Esse mercado tem empate (ex.: futebol)
        </Label>
      </div>

      <div className={cn("grid gap-4", hasDraw ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="homeOdd">Odd casa</Label>
          <Input id="homeOdd" name="homeOdd" type="number" step="0.01" min="1.01" defaultValue="2.00" required />
        </div>
        {hasDraw && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="drawOdd">Odd empate</Label>
            <Input id="drawOdd" name="drawOdd" type="number" step="0.01" min="1.01" defaultValue="3.20" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="awayOdd">Odd fora</Label>
          <Input id="awayOdd" name="awayOdd" type="number" step="0.01" min="1.01" defaultValue="3.00" required />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
        Criar partida
      </Button>
    </form>
  );
}
