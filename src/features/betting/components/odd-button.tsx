"use client";

import { cn } from "@/lib/utils";

interface OddButtonProps {
  label: string;
  value: number;
  isSelected?: boolean;
  onClick?: () => void;
}

export function OddButton({ label, value, isSelected, onClick }: OddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-border bg-background px-2 py-2 transition-colors hover:border-primary/40 hover:bg-accent",
        isSelected && "border-primary bg-primary text-primary-foreground hover:bg-primary"
      )}
    >
      <span
        className={cn(
          "line-clamp-1 text-[11px] text-muted-foreground",
          isSelected && "text-primary-foreground/80"
        )}
      >
        {label}
      </span>
      <span className="text-sm font-semibold">{value.toFixed(2)}</span>
    </button>
  );
}
