"use server";

import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

const VALID = new Set(["present", "absent", "excused", "late"]);

// Save attendance for one meeting. One upsert per member; blank/unknown
// statuses clear that member's record (they weren't marked). Exec-gated
// in code and re-enforced by RLS (attendance_write_exec).
export async function saveAttendance(
  eventId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    if (!(await getIsExec())) return { error: "Only exec can take attendance." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const toUpsert: {
      event_id: string;
      user_id: string;
      status: string;
      recorded_by: string | undefined;
    }[] = [];
    const toClear: string[] = [];

    for (const [key, value] of formData.entries()) {
      if (!key.startsWith("status_")) continue;
      const userId = key.slice("status_".length);
      const status = String(value);
      if (VALID.has(status)) {
        toUpsert.push({ event_id: eventId, user_id: userId, status, recorded_by: user?.id });
      } else {
        toClear.push(userId);
      }
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from("attendance_records")
        .upsert(toUpsert, { onConflict: "event_id,user_id" });
      if (error) return { error: error.message };
    }
    if (toClear.length > 0) {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("event_id", eventId)
        .in("user_id", toClear);
      if (error) return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save attendance. Try again." };
  }

  revalidatePath(`/calendar/${eventId}/attendance`);
  return {};
}
