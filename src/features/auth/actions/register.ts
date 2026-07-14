"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { isUsernameTaken } from "@/lib/username";
import { registerSchema } from "@/lib/validations/auth";

export interface RegisterInput {
  username: string;
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

  const { username, email, password } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return { success: false, message: "Já existe uma conta com esse e-mail." };
  }

  if (await isUsernameTaken(username)) {
    return { success: false, message: "Esse username já está em uso. Escolha outro." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: {
        // `name` permanece como display fallback; a identidade pública é o username.
        name: username,
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
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2002") {
      return { success: false, message: "E-mail ou username já está em uso." };
    }
    throw error;
  }

  return { success: true };
}
