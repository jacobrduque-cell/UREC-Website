"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const TYPES = ["new_announcement", "new_assignment", "assignment_graded", "assignment_due_soon"];
const CHANNELS = new Set(["email", "in_app", "off"]);

// Save the signed-in member's notification channels. Own rows only,
// enforced by RLS (notification_prefs_write_own) on top of the user id
// we set here.
export async function saveNotificationPrefs(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const rows = TYPES.map((type) => ({
    user_id: user.id,
    type,
    channel: String(formData.get(`channel_${type}`) ?? "email"),
  })).filter((r) => CHANNELS.has(r.channel));

  const { error } = await supabase
    .from("notification_prefs")
    .upsert(rows, { onConflict: "user_id,type" });
  if (error) throw new Error(error.message);

  revalidatePath("/settings/notifications");
}
