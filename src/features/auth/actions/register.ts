"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/lib/username";
import { registerSchema } from "@/lib/validations/auth";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  success: boolean;
  message?: string;
}

const INITIAL_COINS = 10_000;

export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { name, email, password } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { success: false, message: "Já existe uma conta com esse e-mail." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const username = await generateUniqueUsername(name, email);

  await prisma.user.create({
    data: {
      name,
      email,
      username,
      password: passwordHash,
      wallet: {
        create: {
          balance: INITIAL_COINS,
          transactions: {
            create: {
              type: "REGISTRATION_BONUS",
              amount: INITIAL_COINS,
              balanceAfter: INITIAL_COINS,
              note: "Bônus de cadastro",
            },
          },
        },
      },
    },
  });

  return { success: true };
}
