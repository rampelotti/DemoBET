"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/features/admin/data/get-current-admin";
import { importMatchesFromProvider } from "@/features/betting/data/matches-repository";
import { getActiveOddsProvider } from "@/lib/providers/get-active-odds-provider";
import { prisma } from "@/lib/prisma";

export interface ImportMatchesResult {
  success: boolean;
  message: string;
}

export async function importMatchesAction(): Promise<ImportMatchesResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, message: "Não autorizado." };
  }

  const imported = await importMatchesFromProvider(getActiveOddsProvider());

  await prisma.adminLog.create({
    data: {
      adminEmail: admin.email,
      action: "IMPORT_MATCHES",
      targetType: "Match",
      metadata: { imported },
    },
  });

  revalidatePath("/admin/matches");
  revalidatePath("/");

  return {
    success: true,
    message:
      imported > 0
        ? `${imported} partida(s) importada(s) com sucesso.`
        : "Nenhuma partida nova encontrada (todas já importadas).",
  };
}
