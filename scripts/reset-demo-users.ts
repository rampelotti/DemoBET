import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_EMAIL_PREFIX = "demo.apostador.";
const INITIAL_COINS = 10_000;

/**
 * Mantém os usuários demo, mas zera o desempenho:
 * - apaga todas as apostas
 * - reseta o saldo para 10.000 Coins
 * - limpa o histórico de carteira e recria o bônus inicial
 */
async function main() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX } },
    select: { id: true, email: true, wallet: { select: { id: true } } },
  });

  if (demoUsers.length === 0) {
    console.log(JSON.stringify({ reset: 0, message: "Nenhum usuário demo encontrado." }));
    return;
  }

  const userIds = demoUsers.map((user) => user.id);
  const walletIds = demoUsers
    .map((user) => user.wallet?.id)
    .filter((id): id is string => Boolean(id));

  const result = await prisma.$transaction(async (tx) => {
    const deletedBets = await tx.bet.deleteMany({
      where: { userId: { in: userIds } },
    });

    let deletedTransactions = 0;
    if (walletIds.length > 0) {
      const wiped = await tx.transaction.deleteMany({
        where: { walletId: { in: walletIds } },
      });
      deletedTransactions = wiped.count;

      await tx.wallet.updateMany({
        where: { id: { in: walletIds } },
        data: { balance: INITIAL_COINS },
      });

      for (const walletId of walletIds) {
        await tx.transaction.create({
          data: {
            walletId,
            type: "REGISTRATION_BONUS",
            amount: INITIAL_COINS,
            balanceAfter: INITIAL_COINS,
            note: "Bônus de cadastro (reset demo)",
          },
        });
      }
    }

    return {
      users: demoUsers.length,
      deletedBets: deletedBets.count,
      deletedTransactions,
    };
  });

  console.log(JSON.stringify({ ...result, balanceResetTo: INITIAL_COINS }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
