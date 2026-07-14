"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { BarChart3, Coins, LogOut, Menu } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface DashboardTopbarProps {
  user: {
    name: string;
    email: string;
  };
  coinsBalance: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DashboardTopbar({ user, coinsBalance }: DashboardTopbarProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
          <p className="text-base font-semibold text-foreground">{user.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button asChild size="sm" className="hidden gap-1.5 sm:inline-flex">
          <Link href="/dashboard/desempenho">
            <BarChart3 className="h-4 w-4" />
            Meu Desempenho
          </Link>
        </Button>

        <Button asChild size="icon" className="sm:hidden" aria-label="Meu Desempenho">
          <Link href="/dashboard/desempenho">
            <BarChart3 className="h-4 w-4" />
          </Link>
        </Button>

        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
          <Coins className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {coinsBalance.toLocaleString("pt-BR")}
          </span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar>
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <VisuallyHidden>
            <SheetTitle>Menu de navegação</SheetTitle>
          </VisuallyHidden>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
