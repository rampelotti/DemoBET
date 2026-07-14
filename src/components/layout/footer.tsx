import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";

const FOOTER_COLUMNS = [
  {
    title: "Produto",
    links: [
      { label: "Recursos", href: "#features" },
      { label: "Como funciona", href: "#how-it-works" },
      { label: "Planos", href: "#pricing" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { label: "Sobre nós", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Contato", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Termos de uso", href: "#" },
      { label: "Privacidade", href: "#" },
      { label: "Jogo responsável", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Teste estratégias de apostas esportivas com dados históricos, sem
              arriscar dinheiro real.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title} className="flex flex-col gap-4">
              <span className="text-sm font-semibold text-foreground">{column.title}</span>
              <ul className="flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} DemoScore. Todos os direitos reservados.</p>
          <p>Plataforma de simulação. Nenhuma aposta real é realizada.</p>
        </div>
      </div>
    </footer>
  );
}
