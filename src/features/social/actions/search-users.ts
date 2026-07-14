"use server";

import { searchUsersWithRelation } from "@/features/social/data/search-users";

export async function searchUsersAction(query: string, currentUserId: string) {
  return searchUsersWithRelation(query, currentUserId);
}
