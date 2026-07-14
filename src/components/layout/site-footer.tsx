import { Badge } from "@/components/ui/badge";

/**
 * Rodapé compacto do MVP: aviso de beta, simulação e direitos autorais.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-border/80 pt-6 pb-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-semibold uppercase tracking-wide">
            Beta
          </Badge>
          <p className="text-xs text-muted-foreground sm:text-sm">
            DemoScore está em fase beta — recursos e odds podem mudar sem aviso.
          </p>
        </div>

        <div className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <p>
            Plataforma de <span className="font-medium text-foreground">simulação</span>. Nenhuma
            aposta com dinheiro real é realizada. Use apenas Coins virtuais.
          </p>
          <p>
            © {year} <span className="font-medium text-foreground">DemoScore</span>. Ideia,
            conceito e desenvolvimento por{" "}
            <span className="font-medium text-foreground">Gabriel Rampelotti</span>. Todos os
            direitos reservados.
          </p>
          <p className="text-[11px] text-muted-foreground/90">
            Conteúdo, marca, layout e mecânicas deste produto são de natureza autoral. É proibida
            a cópia, reprodução, engenharia reversa ou exploração comercial da ideia e do software
            sem autorização prévia por escrito do autor.
          </p>
        </div>
      </div>
    </footer>
  );
}
