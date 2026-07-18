"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const TYPES = ["new_announcement", "new_assignment", "assignment_graded", "assignment_due_soon"];
const CHANNELS = new Set(["email", "in_app", "off"]);

// Save the signed-in member's notification channels. Own rows only,
// enforced by RLS (notification_prefs_write_own) on top of the user id
// we set here.
export async function saveNotificationPrefs(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Your session expired — refresh the page and sign in again." };
    }

    const rows = TYPES.map((type) => ({
      user_id: user.id,
      type,
      channel: String(formData.get(`channel_${type}`) ?? "email"),
    })).filter((r) => CHANNELS.has(r.channel));

    const { error } = await supabase
      .from("notification_prefs")
      .upsert(rows, { onConflict: "user_id,type" });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save your notification settings. Try again." };
  }

  revalidatePath("/settings/notifications");
  redirect("/settings/notifications?saved=1");
}
