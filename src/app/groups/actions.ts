"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isGroupJoinRateLimited } from "@/lib/ratelimit";

export async function joinGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in to join a group." };

  if (await isGroupJoinRateLimited(user.id, supabase)) {
    return { error: "You've joined too many groups recently. Please try again later." };
  }

  // Verify the group exists and grab the slug for cache invalidation
  const { data: group } = await supabase
    .from("groups")
    .select("id, slug")
    .eq("id", groupId)
    .single();

  if (!group) return { error: "Group not found." };

  const { error } = await supabase.from("group_members").insert({
    group_id: groupId,
    user_id: user.id,
    role: "member",
  });

  if (error) {
    // 23505 = unique_violation — already a member
    if (error.code === "23505") return { error: "You are already a member of this group." };
    return { error: error.message };
  }

  revalidatePath(`/groups/${group.slug}`);
  return { error: null };
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Creators cannot leave their own group; also fetch slug for cache invalidation
  const { data: group } = await supabase
    .from("groups")
    .select("created_by, slug")
    .eq("id", groupId)
    .single();

  if (group?.created_by === user.id) {
    return { error: "Group creators cannot leave their own group." };
  }

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/groups/${group?.slug ?? groupId}`);
  return { error: null };
}
