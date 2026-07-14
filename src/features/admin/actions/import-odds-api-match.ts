"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/features/admin/data/get-current-admin";
import { importMatchesFromProvider } from "@/features/betting/data/matches-repository";
import { oddsApiProvider } from "@/lib/providers/odds-api-provider";
import { prisma } from "@/lib/prisma";

export interface ImportOddsApiMatchResult {
  success: boolean;
  message: string;
}

/**
 * Importa a partida validada em `/admin/odds-api-test` para o banco real,
 * usando o mesmo pipeline de importação do mock (`importMatchesFromProvider`).
 * A partir daí ela é uma `Match` normal: aparece na Home, pode ser apostada
 * com Coins e liquidada como qualquer outra.
 */
export async function importOddsApiMatch(): Promise<ImportOddsApiMatchResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, message: "Não autorizado." };
  }

  let imported = 0;
  try {
    imported = await importMatchesFromProvider(oddsApiProvider);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return { success: false, message: `Falha ao importar: ${message}` };
  }

  await prisma.adminLog.create({
    data: {
      adminEmail: admin.email,
      action: "IMPORT_ODDS_API_MATCH",
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
        ? "Partida importada! Já está disponível na Home para apostar com Coins."
        : "Essa partida já estava importada — confira na Home ou em /admin/matches.",
  };
}
