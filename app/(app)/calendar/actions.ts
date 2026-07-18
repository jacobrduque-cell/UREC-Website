"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { pacificWallClockToUtcISO } from "@/lib/timezone";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";

export async function createEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");
  const allDay = formData.get("all_day") === "on";
  const scope = String(formData.get("scope") ?? "course");

  if (!title || !startsAt) {
    throw new Error("Title and start time are required.");
  }

  // datetime-local values are Pacific wall-clock (see lib/timezone).
  const startsIso = pacificWallClockToUtcISO(startsAt);
  const endsIso = pacificWallClockToUtcISO(endsAt);
  if (!startsIso) throw new Error("Enter a valid start time.");
  if (endsIso && new Date(endsIso) < new Date(startsIso)) {
    throw new Error("The end time can't be before the start time.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const course = await getCurrentCourse();

  const { error } = await supabase.from("calendar_events").insert({
    course_id: scope === "platform" ? null : (course?.id ?? null),
    title,
    description: description || null,
    starts_at: startsIso,
    ends_at: endsIso,
    all_day: allDay,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
  redirect("/calendar");
}

/**
 * Mints a fresh calendar subscribe link and invalidates any earlier one
 * for this user — only the hash is stored (api_tokens.token_hash), so
 * the raw token can only ever be shown once, right after creation.
 */
export async function generateCalendarFeedToken() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("api_tokens")
    .delete()
    .eq("user_id", user.id)
    .contains("scopes", ["calendar:read"]);

  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const { error } = await supabase.from("api_tokens").insert({
    user_id: user.id,
    name: "Calendar Feed",
    token_hash: tokenHash,
    scopes: ["calendar:read"],
  });
  if (error) throw new Error(error.message);

  redirect(`/calendar?feed=${rawToken}`);
}
