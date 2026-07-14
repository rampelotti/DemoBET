"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/features/admin/data/get-current-admin";
import { prisma } from "@/lib/prisma";

export interface CreateMatchInput {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  hasDraw: boolean;
  homeOdd: number;
  drawOdd?: number;
  awayOdd: number;
}

export interface CreateMatchResult {
  success: boolean;
  message?: string;
  matchId?: string;
}

export async function createMatch(input: CreateMatchInput): Promise<CreateMatchResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { success: false, message: "Não autorizado." };
  }

  if (!input.sport || !input.league || !input.homeTeam || !input.awayTeam || !input.startTime) {
    return { success: false, message: "Preencha todos os campos obrigatórios." };
  }

  const startTime = new Date(input.startTime);
  if (Number.isNaN(startTime.getTime())) {
    return { success: false, message: "Data/hora de início inválida." };
  }

  const odds = [
    { selection: "HOME", label: input.homeTeam, value: input.homeOdd },
    ...(input.hasDraw && input.drawOdd
      ? [{ selection: "DRAW", label: "Empate", value: input.drawOdd }]
      : []),
    { selection: "AWAY", label: input.awayTeam, value: input.awayOdd },
  ];

  if (odds.some((odd) => !Number.isFinite(odd.value) || odd.value <= 1)) {
    return { success: false, message: "As odds devem ser números maiores que 1." };
  }

  const match = await prisma.match.create({
    data: {
      sport: input.sport,
      league: input.league,
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      startTime,
      markets: {
        create: {
          type: "MATCH_WINNER",
          label: input.hasDraw ? "Resultado final" : "Vencedor da partida",
          odds: { create: odds },
        },
      },
    },
  });

  await prisma.adminLog.create({
    data: {
      adminEmail: admin.email,
      action: "CREATE_MATCH",
      targetType: "Match",
      targetId: match.id,
      metadata: { homeTeam: input.homeTeam, awayTeam: input.awayTeam },
    },
  });

  revalidatePath("/admin/matches");
  revalidatePath("/");

  return { success: true, matchId: match.id };
}
