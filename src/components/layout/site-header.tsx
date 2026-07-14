"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Coins, LogOut, Menu, Search, Sparkles, Ticket, User, Users, BarChart3 } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SportsbookSidebar } from "@/features/betting/components/sportsbook-sidebar";
import { SPORT_NAV_ITEMS } from "@/features/betting/data/sports-nav";
import { trackNavClick } from "@/lib/analytics/gtm";

interface SiteHeaderProps {
  user?: {
    name: string;
    email: string;
    displayName?: string;
  } | null;
  coinsBalance?: number | null;
}

function getInitials(name: string) {
  const clean = name.replace(/^@/, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function SiteHeader({ user, coinsBalance }: SiteHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? undefined;
  const displayName = user?.displayName ?? user?.name ?? "";

  return (
    <header className="z-40 w-full shrink-0 border-b border-border bg-background">
      <div className="flex items-center gap-3 border-b border-border/60 px-3 py-3 pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu de esportes"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Logo className="shrink-0" />

        <form action="/" className="relative ml-2 hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={searchQuery}
            placeholder="Buscar times, ligas ou partidas"
            className="pl-9"
          />
        </form>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <Badge className="hidden sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" />
            Beta · Simulação
          </Badge>

          {user ? (
            <>
              {/* No mobile esses atalhos ficam só no menu do avatar — evita cortar o perfil. */}
              <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 md:inline-flex">
                <Link
                  href="/social"
                  onClick={() => trackNavClick("header_fantasy", "Fantasy", "/social")}
                >
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Fantasy</span>
                </Link>
              </Button>

              <Button asChild size="sm" className="hidden gap-1.5 md:inline-flex">
                <Link
                  href="/dashboard/desempenho"
                  onClick={() =>
                    trackNavClick("header_performance", "Meu Desempenho", "/dashboard/desempenho")
                  }
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden lg:inline">Meu Desempenho</span>
                </Link>
              </Button>

              <Button asChild variant="ghost" size="sm" className="hidden gap-1.5 md:inline-flex">
                <Link
                  href="/meus-palpites"
                  onClick={() => trackNavClick("header_my_bets", "Meus palpites", "/meus-palpites")}
                >
                  <Ticket className="h-4 w-4" />
                  <span className="hidden lg:inline">Meus palpites</span>
                </Link>
              </Button>

              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 sm:gap-2 sm:px-3 sm:py-1.5">
                <Coins className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
                <span className="text-xs font-semibold tabular-nums text-foreground sm:text-sm">
                  {(coinsBalance ?? 0).toLocaleString("pt-BR")}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Abrir menu do perfil"
                    className="flex shrink-0 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(displayName.replace(/^@/, ""))}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/social">
                      <Users className="h-4 w-4" />
                      Fantasy Social
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <User className="h-4 w-4" />
                      Meu perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/desempenho">
                      <BarChart3 className="h-4 w-4" />
                      Meu Desempenho
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/meus-palpites">
                      <Ticket className="h-4 w-4" />
                      Meus palpites
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut className="h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Cadastrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <nav className="hidden items-center gap-1 overflow-x-auto px-4 py-2 lg:flex lg:px-6">
        {SPORT_NAV_ITEMS.filter((item) => !item.comingSoon).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.sport}
              href={`/?sport=${item.sport}`}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <SportsbookSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
