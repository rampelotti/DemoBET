import {
  LayoutDashboard,
  ListChecks,
  Plug,
  ScrollText,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Visão geral", href: "/admin", icon: LayoutDashboard },
  { label: "Usuários", href: "/admin/users", icon: Users },
  { label: "Partidas", href: "/admin/matches", icon: Trophy },
  { label: "Apostas", href: "/admin/bets", icon: ListChecks },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
  { label: "Teste Odds API", href: "/admin/odds-api-test", icon: Plug },
];
