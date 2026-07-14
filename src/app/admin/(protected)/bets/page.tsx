import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { getAllBets } from "@/features/admin/data/get-all-bets";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Admin · Apostas",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const coinsFormatter = new Intl.NumberFormat("pt-BR");

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Em aberto",
  WON: "Ganha",
  LOST: "Perdida",
  CANCELLED: "Cancelada",
};

const STATUS_CLASSNAME: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary",
  WON: "bg-success/10 text-success",
  LOST: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

interface AdminBetsPageProps {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_TABS = [
  { label: "Todas", status: undefined },
  { label: "Abertas", status: "OPEN" },
  { label: "Ganhas", status: "WON" },
  { label: "Perdidas", status: "LOST" },
  { label: "Canceladas", status: "CANCELLED" },
] as const;

export default async function AdminBetsPage({ searchParams }: AdminBetsPageProps) {
  const { status } = await searchParams;
  const activeStatus =
    status === "OPEN" || status === "WON" || status === "LOST" || status === "CANCELLED"
      ? status
      : undefined;

  const bets = await getAllBets(activeStatus);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Apostas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Últimas 100 apostas de todos os usuários.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = activeStatus === tab.status;
          const href = tab.status ? `/admin/bets?status=${tab.status}` : "/admin/bets";
          return (
            <Link
              key={tab.label}
              href={href}
              className={cn(
                "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "border-primary bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {bets.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nenhuma aposta encontrada" description="Ainda não há apostas nessa categoria." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Seleção(ões)</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Coins</th>
                <th className="px-4 py-3 font-medium">Retorno</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((bet) => (
                <tr key={bet.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{bet.user.name}</p>
                    <p className="text-xs text-muted-foreground">{bet.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bet.selections.map((selection) => selection.selectionLabel).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormatter.format(new Date(bet.placedAt))}
                  </td>
                  <td className="px-4 py-3 text-foreground">{coinsFormatter.format(bet.stake)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {coinsFormatter.format(bet.actualReturn ?? bet.potentialReturn)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        STATUS_CLASSNAME[bet.status]
                      )}
                    >
                      {STATUS_LABEL[bet.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
