import { Activity, Circle, Swords, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { SPORTS } from "@/features/betting/types";

export interface SportNavItem {
  label: string;
  sport: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const SPORT_NAV_ITEMS: SportNavItem[] = [
  { label: "Futebol", sport: SPORTS.FOOTBALL, icon: Trophy },
  { label: "Basquete", sport: SPORTS.BASKETBALL, icon: Circle },
  { label: "Tênis", sport: SPORTS.TENNIS, icon: Target },
  { label: "Vôlei", sport: "volei", icon: Activity, comingSoon: true },
  { label: "MMA", sport: "mma", icon: Swords, comingSoon: true },
];

export interface TimeFilterItem {
  label: string;
  when: "hoje" | "amanha" | "semana";
}

export const TIME_FILTER_ITEMS: TimeFilterItem[] = [
  { label: "Hoje", when: "hoje" },
  { label: "Amanhã", when: "amanha" },
  { label: "Esta semana", when: "semana" },
];
