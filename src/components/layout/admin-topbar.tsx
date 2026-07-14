"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { AdminSidebarNav } from "@/components/layout/admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface AdminTopbarProps {
  email: string;
}

export function AdminTopbar({ email }: AdminTopbarProps) {
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
        <p className="text-sm text-muted-foreground">
          Logado como <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <Badge variant="secondary">Ambiente de desenvolvimento</Badge>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <VisuallyHidden>
            <SheetTitle>Menu administrativo</SheetTitle>
          </VisuallyHidden>
          <AdminSidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
