"use client";

import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackCtaClick } from "@/lib/analytics/gtm";

interface SocialPromoBannerProps {
  isLoggedIn: boolean;
}

export function SocialPromoBanner({ isLoggedIn }: SocialPromoBannerProps) {
  return (
    <section className="animate-slide-up overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-background to-background p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Users className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">Fantasy Social</span>
          </div>
          <h2 className="max-w-xl text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Convide seus amigos, compare estratégias e descubra quem é o melhor apostador da
            DemoScore.
          </h2>
          <p className="max-w-lg text-sm text-muted-foreground">
            Crie grupos privados, acompanhe rankings por ROI e lucro, e veja o histórico de
            palpites dos seus amigos.
          </p>
        </div>

        <Button asChild size="lg" className="shrink-0 gap-2">
          <Link
            href={isLoggedIn ? "/social" : "/register"}
            onClick={() =>
              trackCtaClick(
                isLoggedIn ? "banner_fantasy" : "banner_register_fantasy",
                isLoggedIn ? "Explorar Fantasy" : "Criar conta grátis"
              )
            }
          >
            {isLoggedIn ? "Explorar Fantasy" : "Criar conta grátis"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
