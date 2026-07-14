# DemoScore

DemoScore é uma casa de apostas esportivas **simulada**: os usuários apostam em
partidas (dados mockados hoje, prontos para vir de uma API real no futuro)
usando **Coins** virtuais, sem qualquer dinheiro real envolvido. Todo novo
cadastro começa com **10.000 Coins**.

## Stack

- [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix UI + CVA)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [Auth.js v5](https://authjs.dev/) (Credentials + JWT)
- [Zustand](https://zustand-demo.pmnd.rs/) (estado do cupom de apostas)
- [Zod](https://zod.dev/) (validação de formulários)

## Estrutura do projeto

O código é organizado por **features**, mantendo componentes pequenos,
reutilizáveis e fáceis de evoluir.

```
src/
  app/
    (sportsbook)/              # Home pública: partidas + cupom (Header/Sidebar/BetSlip)
    (auth)/                    # Login e cadastro de usuários
    dashboard/                 # Área logada: perfil (estatísticas) e histórico de apostas
    admin/
      login/                   # Login do painel administrativo (dev-only)
      (protected)/             # Dashboard, usuários, partidas, apostas e logs do admin
    api/auth/[...nextauth]/    # Rota do Auth.js
  components/
    ui/                        # Primitivos shadcn/ui (Button, Card, Input, DropdownMenu...)
    layout/                    # Header, Sidebar, Topbar (sportsbook, dashboard e admin)
    shared/                    # Componentes genéricos (Logo, EmptyState...)
  features/
    auth/                      # Formulários de login/cadastro + criação de Wallet
    betting/                   # Partidas, mercados/odds, cupom de apostas, histórico
    dashboard/                 # Estatísticas do perfil (ROI, winrate, streak...)
    admin/                     # Gestão de usuários, partidas, liquidação, logs
  lib/
    providers/                 # Abstração MatchProvider (mock hoje, API real no futuro)
    prisma.ts, utils.ts, validations/
  store/
    bet-slip-store.ts          # Estado do cupom (Zustand + localStorage)
  auth.ts / auth.config.ts     # Configuração do Auth.js (config edge-safe separada)
  middleware.ts                # Proteção de /dashboard e /admin
prisma/
  schema.prisma                # Users, Wallet, Match, Market, Odd, Bet, BetSelection, AdminLog...
```

## Como funciona

- **Partidas**: vêm de um `MatchProvider` (hoje um mock com jogos futuros de
  futebol, basquete e tênis). Troque a implementação em
  `src/lib/providers/` para plugar uma API real sem alterar o resto do app.
- **Apostas**: o usuário monta um cupom com uma ou mais odds e confirma com
  Coins. O saldo é debitado imediatamente (`src/features/betting/actions/place-bet.ts`).
- **Liquidação**: o admin informa o placar final de uma partida e o sistema
  resolve automaticamente as seleções pendentes (vitória/empate, over/under,
  ambas marcam) e credita os ganhadores.
- **Admin (dev-only)**: login separado em `/admin/login` com credenciais fixas
  de desenvolvimento (`ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env`). Permite
  gerenciar Coins de usuários, importar/criar/liquidar partidas, ver todas as
  apostas e auditar ações em `/admin/logs`.

## Como rodar localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de variáveis de ambiente e configure sua conexão com o PostgreSQL:

   ```bash
   cp .env.example .env
   ```

   Preencha `DATABASE_URL` com as credenciais do seu Postgres local, gere um
   `AUTH_SECRET` (`npx auth secret`) e defina `ADMIN_EMAIL`/`ADMIN_PASSWORD`
   para o painel administrativo.

3. Sincronize o schema do Prisma com o banco de dados:

   ```bash
   npm run db:push
   ```

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

5. Acesse [http://localhost:3000](http://localhost:3000) para a home da casa
   de apostas, ou [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   para o painel administrativo.

## Status atual

MVP funcional completo: cadastro/login reais, home com partidas e cupom de
apostas, perfil com estatísticas (ROI, winrate, sequência), histórico de
apostas por status e área administrativa (usuários, Coins, partidas,
liquidação, logs). Próximos passos naturais: busca de partidas, múltiplas
seleções por cupom (parlay) e integração com uma API real de odds.
