import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { SiteFooter } from "@/components/layout/site-footer";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-grid-pattern px-4 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative flex w-full max-w-lg flex-col items-center gap-8">
        <Logo />
        {children}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o site
        </Link>
        <div className="w-full">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
