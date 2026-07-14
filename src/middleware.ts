import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Instância separada e "edge-safe" só para o middleware — não importa
// bcrypt/Prisma Adapter (ver src/auth.config.ts e src/auth.ts).
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
