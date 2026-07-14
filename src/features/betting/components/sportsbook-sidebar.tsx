"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Clock, Heart, Home, Radio, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SPORT_NAV_ITEMS, TIME_FILTER_ITEMS } from "@/features/betting/data/sports-nav";
import { cn } from "@/lib/utils";

interface SportsbookSidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function SportsbookSidebar({ onNavigate, className }: SportsbookSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSport = searchParams.get("sport");
  const activeWhen = searchParams.get("when");

  function buildHref(params: Record<string, string | undefined>) {
    // Filtros de esporte/período são da Home — ao clicar em outra rota
    // (ex.: /meus-palpites) devemos voltar para /, não manter o pathname atual.
    const next = new URLSearchParams(pathname === "/" ? searchParams.toString() : "");
    for (const [key, value] of Object.entries(params)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    const query = next.toString();
    return query ? `/?${query}` : "/";
  }

  return (
    <div className={cn("flex h-full flex-col gap-6 py-6", className)}>
      <div className="px-4">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Navegar
        </p>
        <nav className="mt-2 flex flex-col gap-1">
          <Link
            href="/"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname === "/" && !activeSport && !activeWhen && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Home className="h-4 w-4" strokeWidth={2.25} />
            Início
          </Link>
          <Link
            href="/social"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              pathname.startsWith("/social") && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
            )}
          >
            <Users className="h-4 w-4" strokeWidth={2.25} />
            Fantasy Social
          </Link>
          <button
            type="button"
            disabled
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
          >
            <span className="flex items-center gap-3">
              <Radio className="h-4 w-4" strokeWidth={2.25} />
              Ao Vivo
            </span>
            <Badge variant="secondary" className="text-[10px]">
              Em breve
            </Badge>
          </button>
          <button
            type="button"
            disabled
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
          >
            <span className="flex items-center gap-3">
              <Heart className="h-4 w-4" strokeWidth={2.25} />
              Favoritos
            </span>
            <Badge variant="secondary" className="text-[10px]">
              Em breve
            </Badge>
          </button>

          {TIME_FILTER_ITEMS.map((item) => {
            const isActive = activeWhen === item.when;
            return (
              <Link
                key={item.when}
                href={buildHref({ when: isActive ? undefined : item.when })}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                )}
              >
                <Clock className="h-4 w-4" strokeWidth={2.25} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Separator />

      <div className="px-4">
        <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Esportes
        </p>
        <nav className="mt-2 flex flex-col gap-1">
          {SPORT_NAV_ITEMS.map((item) => {
            const isActive = activeSport === item.sport;
            const Icon = item.icon;

            if (item.comingSoon) {
              return (
                <button
                  key={item.sport}
                  type="button"
                  disabled
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground/60"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                    {item.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Em breve
                  </Badge>
                </button>
              );
            }

            return (
              <Link
                key={item.sport}
                href={buildHref({ sport: isActive ? undefined : item.sport })}
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
      </div>
    </div>
  );
}
