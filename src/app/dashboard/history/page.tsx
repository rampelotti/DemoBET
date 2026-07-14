import { redirect } from "next/navigation";

// "Histórico" foi renomeado para "Meus palpites" e saiu do /dashboard para
// ficar acessível direto pelo header. Mantemos esse redirect para não
// quebrar links antigos.
interface HistoryRedirectPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function HistoryRedirectPage({ searchParams }: HistoryRedirectPageProps) {
  const { status } = await searchParams;
  redirect(status ? `/meus-palpites?status=${status}` : "/meus-palpites");
}
