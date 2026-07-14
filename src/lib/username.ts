import { prisma } from "@/lib/prisma";

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrador",
  "demoscore",
  "demobet",
  "support",
  "suporte",
  "root",
  "system",
  "oficial",
  "me",
  "api",
  "null",
  "undefined",
]);

/**
 * Normaliza a tag do usuário: remove `@`, espaços e deixa em minúsculas.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function formatUsernameTag(username: string): string {
  const normalized = normalizeUsername(username);
  return normalized ? `@${normalized}` : "";
}

/**
 * Gera um username único a partir do nome ou e-mail do usuário.
 * Usado apenas para backfill de contas antigas sem username.
 */
export async function generateUniqueUsername(name: string, email: string): Promise<string> {
  const { slugify } = await import("@/lib/slug");
  const emailBase = email.split("@")[0] ?? "user";
  const rawBase = slugify(name || emailBase).replace(/-/g, "").slice(0, 18) || "user";
  let candidate = rawBase.replace(/[^a-z0-9_]/g, "");
  if (!/^[a-z]/.test(candidate)) {
    candidate = `u${candidate}`.slice(0, 20);
  }
  if (!isValidUsernameFormat(candidate)) {
    candidate = `user${Date.now().toString(36)}`.slice(0, 20);
  }

  let suffix = 0;
  let attempt = candidate;

  while (true) {
    if (!RESERVED_USERNAMES.has(attempt)) {
      const existing = await prisma.user.findUnique({ where: { username: attempt } });
      if (!existing) return attempt;
    }
    suffix += 1;
    attempt = `${candidate.slice(0, 16)}${suffix}`.slice(0, 20);
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

export async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (RESERVED_USERNAMES.has(normalized)) return true;

  const existing = await prisma.user.findUnique({ where: { username: normalized } });
  if (!existing) return false;
  if (excludeUserId && existing.id === excludeUserId) return false;
  return true;
}
