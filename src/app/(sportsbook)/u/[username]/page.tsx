import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/features/auth/data/get-current-user";
import { PublicProfileView } from "@/features/social/components/public-profile-view";
import {
  getFriendshipState,
  getPublicProfile,
} from "@/features/social/data/get-public-profile";

interface PublicProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  return { title: profile?.user.name ?? "Perfil" };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { username } = await params;
  const currentUser = await getCurrentUser();
  const profile = await getPublicProfile(username, currentUser?.id);

  if (!profile) notFound();

  const friendship = currentUser
    ? await getFriendshipState(currentUser.id, profile.user.id)
    : { state: "NONE" as const };

  return (
    <PublicProfileView
      profile={profile}
      friendshipState={friendship.state}
      pendingFriendshipId={friendship.friendshipId}
    />
  );
}
