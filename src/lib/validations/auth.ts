import { z } from "zod";

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe sua senha"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .transform(normalizeUsername)
    .refine((value) => USERNAME_PATTERN.test(value), {
      message:
        "Username inválido. Use 3–20 caracteres: comece com letra, depois letras, números ou _.",
    }),
  email: z.string().email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
