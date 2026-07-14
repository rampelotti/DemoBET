import { BarChart3, History, LayoutDashboard, Trophy, type LucideIcon } from "lucide-react";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Meu perfil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meu Desempenho", href: "/dashboard/desempenho", icon: BarChart3 },
  { label: "Meus palpites", href: "/meus-palpites", icon: History },
  { label: "Apostar agora", href: "/", icon: Trophy },
];
