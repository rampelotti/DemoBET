import type { Metadata } from "next";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { getAdminLogs } from "@/features/admin/data/get-admin-logs";

export const metadata: Metadata = {
  title: "Admin · Logs",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export default async function AdminLogsPage() {
  const logs = await getAdminLogs();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Logs administrativos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Auditoria das últimas 200 ações realizadas por administradores.
        </p>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum log ainda" description="As ações administrativas aparecerão aqui." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-background">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Alvo</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {dateFormatter.format(new Date(log.createdAt))}
                  </td>
                  <td className="px-4 py-3 text-foreground">{log.adminEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.targetType ?? "—"}
                    {log.targetId ? ` #${log.targetId.slice(0, 8)}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
