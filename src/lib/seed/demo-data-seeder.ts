import bcrypt from "bcryptjs";

import { importMatchesFromProvider } from "@/features/betting/data/matches-repository";
import { settleMatchCore } from "@/features/betting/lib/settle-match-core";
import { generateUniqueGroupSlug } from "@/features/social/data/groups";
import { generateUniqueUsername } from "@/lib/username";
import { mockOddsProvider } from "@/lib/providers/mock-odds-provider";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL_PREFIX = "demo.apostador.";
const DEMO_PASSWORD = "demo123";
const USER_COUNT = 50;

const GROUP_NAMES = [
  "Mestres do Handicap",
  "Palpiteiros BR",
  "Liga dos Coins",
  "ROI Hunters",
  "Grupo dos Craques",
  "Estrategistas FC",
  "High Rollers Demo",
];

const FIRST_NAMES = [
  "Lucas", "Gabriel", "Rafael", "Bruno", "Felipe", "Thiago", "Matheus", "Gustavo",
  "Ana", "Julia", "Mariana", "Camila", "Beatriz", "Larissa", "Fernanda", "Patricia",
  "Diego", "Rodrigo", "André", "Carlos", "Pedro", "João", "Henrique", "Vitor",
];

const LAST_NAMES = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Costa", "Ferreira", "Almeida",
  "Pereira", "Ribeiro", "Carvalho", "Gomes", "Martins", "Araújo", "Barbosa",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function pickN<T>(items: T[], count: number): T[] {
  const copy = [...items];
  const result: T[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]!);
  }
  return result;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface DemoSeedResult {
  users: number;
  friendships: number;
  groups: number;
  matches: number;
  bets: number;
  settledMatches: number;
}

export async function runDemoDataSeeder(): Promise<DemoSeedResult> {
  const existingDemo = await prisma.user.count({
    where: { email: { startsWith: DEMO_EMAIL_PREFIX } },
  });

  if (existingDemo >= USER_COUNT) {
    console.log("Demo já populado — sincronizando partidas e liquidando pendentes.");
    await importMatchesFromProvider(mockOddsProvider);

    const scheduled = await prisma.match.findMany({
      where: {
        status: "SCHEDULED",
        externalId: { startsWith: mockOddsProvider.externalIdPrefix },
      },
      take: 8,
    });

    let settledCount = 0;
    for (const match of scheduled) {
      const pastStart = new Date(Date.now() - randomInt(3, 48) * 60 * 60 * 1000);
      await prisma.match.update({
        where: { id: match.id },
        data: { startTime: pastStart },
      });
      await settleMatchCore(match.id, randomInt(0, 3), randomInt(0, 3), "system:demo-seeder", {
        skipRevalidate: true,
      });
      settledCount++;
    }

    const matchCount = await prisma.match.count({
      where: { externalId: { startsWith: mockOddsProvider.externalIdPrefix } },
    });
    const betCount = await prisma.bet.count({
      where: { user: { email: { startsWith: DEMO_EMAIL_PREFIX } } },
    });

    return {
      users: existingDemo,
      friendships: 0,
      groups: 0,
      matches: matchCount,
      bets: betCount,
      settledMatches: settledCount,
    };
  }

  await importMatchesFromProvider(mockOddsProvider);

  const matches = await prisma.match.findMany({
    where: { externalId: { startsWith: mockOddsProvider.externalIdPrefix } },
    include: {
      markets: { include: { odds: true } },
    },
    orderBy: { startTime: "asc" },
  });

  if (matches.length === 0) {
    throw new Error("Nenhuma partida mock importada. Verifique o banco de dados.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIds: string[] = [];

  for (let i = 1; i <= USER_COUNT; i++) {
    const padded = String(i).padStart(2, "0");
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const email = `${DEMO_EMAIL_PREFIX}${padded}@demoscore.com`;
    const username = await generateUniqueUsername(name, email);
    const balance = randomInt(3500, 18500);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: passwordHash,
        wallet: {
          create: {
            balance,
            transactions: {
              create: {
                type: "REGISTRATION_BONUS",
                amount: balance,
                balanceAfter: balance,
                note: "Seed demo",
              },
            },
          },
        },
      },
    });
    userIds.push(user.id);
  }

  let friendshipCount = 0;
  for (const userId of userIds) {
    const friends = pickN(
      userIds.filter((id) => id !== userId),
      randomInt(4, 9)
    );

    for (const friendId of friends) {
      const [a, b] = userId < friendId ? [userId, friendId] : [friendId, userId];
      const exists = await prisma.friendship.findUnique({
        where: { requesterId_addresseeId: { requesterId: a, addresseeId: b } },
      });
      if (exists) continue;

      await prisma.friendship.create({
        data: { requesterId: a, addresseeId: b, status: "ACCEPTED" },
      });
      friendshipCount++;
    }
  }

  let groupCount = 0;
  for (const groupName of GROUP_NAMES) {
    const ownerId = pick(userIds);
    const slug = await generateUniqueGroupSlug(groupName);
    const members = pickN(
      userIds.filter((id) => id !== ownerId),
      randomInt(5, 12)
    );

    const group = await prisma.group.create({
      data: {
        name: groupName,
        slug,
        ownerId,
        members: {
          create: [
            { userId: ownerId, role: "OWNER" },
            ...members.map((userId) => ({ userId, role: "MEMBER" as const })),
          ],
        },
      },
    });
    groupCount++;
    void group;
  }

  let betCount = 0;
  const scheduledMatches = matches.filter((m) => m.status === "SCHEDULED");

  for (const userId of userIds) {
    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) continue;

    const betsToPlace = randomInt(6, 14);
    let runningBalance = wallet.balance;

    for (let b = 0; b < betsToPlace; b++) {
      const match = pick(scheduledMatches);
      const market = pick(match.markets);
      const odd = pick(market.odds);
      const stake = randomInt(25, Math.min(250, Math.floor(runningBalance * 0.08)));
      if (stake <= 0 || runningBalance < stake) break;

      const potentialReturn = Math.floor(stake * odd.value);

      await prisma.$transaction(async (tx) => {
        const bet = await tx.bet.create({
          data: {
            userId,
            stake,
            potentialReturn,
            selections: {
              create: {
                oddId: odd.id,
                matchId: match.id,
                marketLabel: market.label,
                selectionLabel: odd.label,
                oddValue: odd.value,
              },
            },
          },
        });

        runningBalance -= stake;
        await tx.wallet.update({
          where: { userId },
          data: { balance: runningBalance },
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "BET_PLACED",
            amount: -stake,
            balanceAfter: runningBalance,
            betId: bet.id,
          },
        });
      });

      betCount++;
    }
  }

  const matchesToSettle = pickN(scheduledMatches, 8);
  let settledCount = 0;

  for (const match of matchesToSettle) {
    const pastStart = new Date(Date.now() - randomInt(3, 48) * 60 * 60 * 1000);
    await prisma.match.update({
      where: { id: match.id },
      data: { startTime: pastStart },
    });

    const homeScore = randomInt(0, 3);
    const awayScore = randomInt(0, 3);
    await settleMatchCore(match.id, homeScore, awayScore, "system:demo-seeder", {
      skipRevalidate: true,
    });
    settledCount++;
  }

  return {
    users: userIds.length,
    friendships: friendshipCount,
    groups: groupCount,
    matches: matches.length,
    bets: betCount,
    settledMatches: settledCount,
  };
}
