import Link from "next/link";
import { LineChart } from "lucide-react";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <LineChart className="h-5 w-5" strokeWidth={2.5} />
      </span>
      {!iconOnly && <span className="text-lg tracking-tight text-foreground">DemoScore</span>}
    </Link>
  );
}
