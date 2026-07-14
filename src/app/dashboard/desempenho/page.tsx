import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { PerformanceDashboard } from "@/features/performance/components/performance-dashboard";
import { getPerformanceData } from "@/features/performance/data/get-performance-data";

export const metadata: Metadata = {
  title: "Meu Desempenho",
};

export default async function PerformancePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const data = await getPerformanceData(currentUser.id);

  return <PerformanceDashboard data={data} />;
}
