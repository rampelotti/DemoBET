import { Suspense } from "react";

import { ParticleBackground } from "@/components/shared/particle-background";
import { Separator } from "@/components/ui/separator";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { BetSlip } from "@/features/betting/components/bet-slip";
import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { getUserBets } from "@/features/betting/data/get-user-bets";
import { MobileBetSlipTrigger } from "@/features/betting/components/mobile-bet-slip-trigger";
import { RecentPicksPanel } from "@/features/betting/components/recent-picks-panel";
import { SportsbookSidebar } from "@/features/betting/components/sportsbook-sidebar";

export default async function SportsbookLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  const recentBets = currentUser ? (await getUserBets(currentUser.id)).slice(0, 4) : [];

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-muted/20">
      <ParticleBackground />
      <Suspense fallback={null}>
        <SiteHeader user={currentUser} coinsBalance={currentUser?.walletBalance} />
      </Suspense>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-background lg:block">
          <Suspense fallback={null}>
            <SportsbookSidebar />
          </Suspense>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 sm:p-6 xl:pb-6">
          {children}
          <SiteFooter />
        </main>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-background xl:block">
          <div className="flex flex-col gap-4 p-4">
            <div>
              <h2 className="mb-4 text-sm font-semibold text-foreground">Cupom de apostas</h2>
              <BetSlip />
            </div>

            {currentUser && (
              <>
                <Separator />
                <RecentPicksPanel bets={recentBets} />
              </>
            )}
          </div>
        </aside>
      </div>

      <MobileBetSlipTrigger />
    </div>
  );
}
