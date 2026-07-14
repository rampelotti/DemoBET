import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Config "edge-safe": nada de bcrypt/Prisma Adapter aqui, porque isso é
 * consumido pelo middleware, que roda em Edge Runtime (sem APIs Node.js).
 * O `auth.ts` importa este arquivo e adiciona os providers/adapter reais,
 * que só executam em rotas normais (Node.js).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    // O middleware roda sua própria instância do NextAuth (só com este
    // config, sem os callbacks de `auth.ts`). Sem repetir `session` aqui,
    // `auth.user.role` chega `undefined` no `authorized` abaixo mesmo com
    // o token contendo `role` — e todo admin cai num loop de redirect para
    // /admin/login.
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname, origin } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAdmin = auth?.user?.role === "ADMIN";

      const isAdminRoute = pathname.startsWith("/admin");
      const isAdminLoginRoute = pathname.startsWith("/admin/login");

      if (isAdminRoute && !isAdminLoginRoute && !isAdmin) {
        return NextResponse.redirect(new URL("/admin/login", origin));
      }

      const isProtectedUserRoute = pathname.startsWith("/dashboard");
      if (isProtectedUserRoute && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
