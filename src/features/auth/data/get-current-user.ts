import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export interface CurrentUser {
  id: string;
  name: string;
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

  const wallet = await prisma.wallet.findUnique({
    where: { userId: session.user.id },
  });

  return {
    id: session.user.id,
    name: session.user.name ?? "Usuário",
    email: session.user.email ?? "",
    walletBalance: wallet?.balance ?? 0,
  };
}
