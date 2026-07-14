import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatUsernameTag } from "@/lib/username";

export interface CurrentUser {
  id: string;
  name: string;
  username: string | null;
  /** Tag pública formatada, ex.: `@usuario`. */
  displayName: string;
  email: string;
  walletBalance: number;
}

/**
 * Sessão + saldo de Coins do usuário logado. Usado pelo Header (exibição) e
 * pelas páginas de Perfil/Histórico (cálculo de estatísticas). Retorna
 * `null` quando não há sessão.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      wallet: { select: { balance: true } },
    },
  });

  if (!user) {
    return null;
  }

  const username = user.username;
  const displayName = username
    ? formatUsernameTag(username)
    : user.name || session.user.name || "Usuário";

  return {
    id: user.id,
    name: user.name,
    username,
    displayName,
    email: user.email,
    walletBalance: user.wallet?.balance ?? 0,
  };
}
