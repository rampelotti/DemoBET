import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMatchBySlug } from "@/features/betting/data/matches-repository";
import { MatchDetail } from "@/features/betting/components/match-detail";

interface MatchPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: MatchPageProps): Promise<Metadata> {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);

  return {
    title: match ? `${match.homeTeam} x ${match.awayTeam}` : "Partida não encontrada",
  };
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { slug } = await params;
  const match = await getMatchBySlug(slug);

  if (!match) {
    notFound();
  }

  return <MatchDetail match={match} />;
}
