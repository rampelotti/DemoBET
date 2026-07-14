import type { Metadata } from "next";
import { Users as UsersIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { AdjustCoinsForm } from "@/features/admin/components/adjust-coins-form";
import { getAllUsers } from "@/features/admin/data/get-all-users";

export const metadata: Metadata = {
  title: "Admin · Usuários",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const coinsFormatter = new Intl.NumberFormat("pt-BR");

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Usuários</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie o saldo de Coins e acompanhe a atividade dos usuários.
        </p>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Nenhum usuário cadastrado" description="Ainda não há usuários na plataforma." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
                <th className="px-4 py-3 font-medium">Apostas</th>
                <th className="px-4 py-3 font-medium">Saldo</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormatter.format(new Date(user.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user._count.bets}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {coinsFormatter.format(user.wallet?.balance ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <AdjustCoinsForm userId={user.id} />
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
