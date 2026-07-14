import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  helperText?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, helperText, className }: StatCardProps) {
  return (
    <Card className={cn("border-border/80 card-interactive", className)}>
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" strokeWidth={2.25} />
        </div>
      </CardContent>
    </Card>
  );
}
