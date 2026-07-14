import { auth } from "@/auth";

export interface CurrentAdmin {
  email: string;
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return { email: session.user.email ?? "" };
}
