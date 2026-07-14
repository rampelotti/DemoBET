import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PerformanceBreakdownRow } from "@/features/performance/types";
import { cn } from "@/lib/utils";

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const unitsFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  signDisplay: "exceptZero",
});

interface PerformanceBreakdownTableProps {
  title: string;
  description?: string;
  rows: PerformanceBreakdownRow[];
  labelHeader?: string;
}

export function PerformanceBreakdownTable({
  title,
  description,
  rows,
  labelHeader = "Item",
}: PerformanceBreakdownTableProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="pb-3 pr-4 font-medium">{labelHeader}</th>
              <th className="pb-3 pr-4 font-medium">Apostas</th>
              <th className="pb-3 pr-4 font-medium">V / D</th>
              <th className="pb-3 pr-4 font-medium">Assert.</th>
              <th className="pb-3 pr-4 font-medium">ROI</th>
              <th className="pb-3 font-medium">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Sem dados neste recorte ainda.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                >
                  <td className="py-3 pr-4 font-medium text-foreground">{row.label}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.bets}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    <span className="text-emerald-600">{row.wins}</span>
                    <span className="mx-1 text-border">/</span>
                    <span className="text-primary">{row.losses}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {percentFormatter.format(row.winRate)}%
                  </td>
                  <td
                    className={cn(
                      "py-3 pr-4 font-medium",
                      row.roi >= 0 ? "text-emerald-600" : "text-primary"
                    )}
                  >
                    {percentFormatter.format(row.roi)}%
                  </td>
                  <td
                    className={cn(
                      "py-3 font-medium",
                      row.profitUnits >= 0 ? "text-emerald-600" : "text-primary"
                    )}
                  >
                    {unitsFormatter.format(row.profitUnits)} u.
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
