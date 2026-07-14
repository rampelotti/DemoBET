"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/features/admin/data/get-current-admin";
import { prisma } from "@/lib/prisma";

export type AdjustCoinsAction = "CREDIT" | "DEBIT" | "RESET";

export interface AdjustCoinsResult {
  success: boolean;
  message?: string;
}

const RESET_BALANCE = 10_000;

export async function adjustCoins(
  userId: string,
  action: AdjustCoinsAction,
  amount?: number
): Promise<AdjustCoinsResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, message: "Não autorizado." };
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return { success: false, message: "Carteira do usuário não encontrada." };
  }

  let delta = 0;
  let transactionType: "ADMIN_CREDIT" | "ADMIN_DEBIT" | "ADMIN_RESET";

  if (action === "RESET") {
    delta = RESET_BALANCE - wallet.balance;
    transactionType = "ADMIN_RESET";
  } else {
    const value = Math.round(amount ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      return { success: false, message: "Informe um valor de Coins válido." };
    }

    if (action === "DEBIT" && wallet.balance < value) {
      return { success: false, message: "O usuário não tem Coins suficientes para debitar." };
    }

    delta = action === "CREDIT" ? value : -value;
    transactionType = action === "CREDIT" ? "ADMIN_CREDIT" : "ADMIN_DEBIT";
  }

  await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { userId },
      data: { balance: { increment: delta } },
    });

    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        type: transactionType,
        amount: delta,
        balanceAfter: updatedWallet.balance,
        note: `Ajuste administrativo (${admin.email})`,
      },
    });

    await tx.adminLog.create({
      data: {
        adminEmail: admin.email,
        action: `ADJUST_COINS_${action}`,
        targetType: "User",
        targetId: userId,
        metadata: { delta, newBalance: updatedWallet.balance },
      },
    });
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/logs");
  revalidatePath("/dashboard");

  return { success: true };
}
