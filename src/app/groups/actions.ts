"use server";

import { redirect } from "next/navigation";
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

/**
 * Permanently deletes a group.
 *
 * Only the group's creator or an admin may do this. What happens:
 *   - The group logo is removed from Storage
 *   - The group row is deleted, which cascades to `group_members`
 *     (ON DELETE CASCADE) and sets `events.group_id` to NULL for every
 *     event that belonged to this group (ON DELETE SET NULL) — events and
 *     their history are preserved and remain live, just unaffiliated.
 */
export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { data: group } = await supabase
    .from("groups")
    .select("created_by")
    .eq("id", groupId)
    .single();

  if (!group) return { error: "Group not found." };

  const isOwner = group.created_by === user.id;

  if (!isOwner) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return { error: "You are not authorised to delete this group." };
    }
  }

  // Remove the logo from Storage (best-effort — try all possible extensions)
  await supabase.storage
    .from("group-logos")
    .remove(["jpg", "jpeg", "png", "webp"].map((ext) => `${groupId}/logo.${ext}`));

  const { error } = await supabase.from("groups").delete().eq("id", groupId);

  if (error) return { error: "Failed to delete group. Please try again." };

  revalidatePath("/groups");
  redirect("/groups");
}
