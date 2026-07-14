import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { BetsHistoryView } from "@/features/betting/components/bets-history-view";
import { getUserBets, isBetStatus } from "@/features/betting/data/get-user-bets";

export const metadata: Metadata = {
  title: "Meus palpites",
};

interface MeusPalpitesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MeusPalpitesPage({ searchParams }: MeusPalpitesPageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?callbackUrl=/meus-palpites");
  }

  const { status } = await searchParams;
  const activeStatus = isBetStatus(status) ? status : undefined;

  const bets = await getUserBets(currentUser.id, activeStatus);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Meus palpites</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe todas as apostas feitas com Coins.
        </p>
      </div>

      <BetsHistoryView bets={bets} activeStatus={activeStatus} basePath="/meus-palpites" />
    </div>
  );
}
