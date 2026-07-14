import { slugify } from "@/lib/slug";
import { prisma } from "@/lib/prisma";

/**
 * Gera um username único a partir do nome ou e-mail do usuário.
 * Usado no cadastro e para backfill de contas antigas sem username.
 */
export async function generateUniqueUsername(name: string, email: string): Promise<string> {
  const emailBase = email.split("@")[0] ?? "user";
  const rawBase = slugify(name || emailBase).replace(/-/g, "").slice(0, 18) || "user";
  let candidate = rawBase;
  let suffix = 0;

  while (true) {
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${rawBase}${suffix}`.slice(0, 24);
  }
}

export async function ensureUsername(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.username) return user.username;

  const username = await generateUniqueUsername(user.name, user.email);
  await prisma.user.update({ where: { id: userId }, data: { username } });
  return username;
}
