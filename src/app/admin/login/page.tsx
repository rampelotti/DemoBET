import type { Metadata } from "next";

import { AdminLoginForm } from "@/features/admin/components/admin-login-form";

export const metadata: Metadata = {
  title: "Admin · Entrar",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <AdminLoginForm />
    </div>
  );
}
