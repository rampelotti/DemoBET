"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";
import { DASHBOARD_NAV_ITEMS } from "@/features/dashboard/data/nav-items";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function SidebarNav({ onNavigate, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="px-6 py-6">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-4">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-6">
        <Separator className="mb-4" />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" strokeWidth={2.25} />
          Sair
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-background lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarNav />
      </div>
    </aside>
  );
}
