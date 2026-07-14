import type { Metadata } from "next";
import { Coins, ListChecks, Trophy, Users } from "lucide-react";

import { StatCard } from "@/features/dashboard/components/stat-card";
import { getAdminOverview } from "@/features/admin/data/get-admin-overview";

export const metadata: Metadata = {
  title: "Admin · Visão geral",
};

const coinsFormatter = new Intl.NumberFormat("pt-BR");

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Visão geral</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Panorama da plataforma em modo simulação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Usuários"
          value={`${overview.totalUsers}`}
          icon={Users}
          helperText="Total de contas criadas"
        />
        <StatCard
          label="Partidas"
          value={`${overview.totalMatches}`}
          icon={Trophy}
          helperText={`${overview.scheduledMatches} agendadas`}
        />
        <StatCard
          label="Apostas"
          value={`${overview.totalBets}`}
          icon={ListChecks}
          helperText={`${overview.openBets} em aberto`}
        />
        <StatCard
          label="Coins em circulação"
          value={coinsFormatter.format(overview.coinsInCirculation)}
          icon={Coins}
          helperText="Soma dos saldos de todas as carteiras"
        />
        <StatCard
          label="Coins em apostas abertas"
          value={coinsFormatter.format(overview.coinsStaked)}
          icon={Coins}
          helperText="Valor total travado em apostas OPEN"
        />
      </div>
    </div>
  );
}
