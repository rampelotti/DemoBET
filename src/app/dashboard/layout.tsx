import { redirect } from "next/navigation";

import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentUser } from "@/features/auth/data/get-current-user";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardTopbar
          user={{ name: currentUser.name, email: currentUser.email }}
          coinsBalance={currentUser.walletBalance}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
