"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackCtaClick } from "@/lib/analytics/gtm";

export function GuestHero() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-10">
      <div className="flex flex-col gap-4">
        <Badge className="w-fit">
          <Sparkles className="h-3.5 w-3.5" />
          Modo Simulação
        </Badge>

        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Treine suas estratégias de apostas sem gastar um real.
        </h1>

        <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
          Na DemoScore você aposta em partidas reais usando Coins virtuais. Teste
          táticas, acompanhe seu desempenho e evolua como apostador — com a
          mesma experiência de uma casa de apostas profissional, mas com risco
          zero.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button asChild size="lg">
            <Link
              href="/register"
              onClick={() => trackCtaClick("hero_register", "Criar conta grátis")}
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login" onClick={() => trackCtaClick("hero_login", "Já tenho conta")}>
              Já tenho conta
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          Todas as apostas são apenas simulações. Nenhum dinheiro real é utilizado.
        </div>
      </div>
    </section>
  );
}
