"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { pacificWallClockToUtcISO } from "@/lib/timezone";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";

// Returns `{ error }` on any failure instead of throwing, so the reason
// reaches the form inline (via useActionState) rather than being redacted
// into the generic error page. The redirect on success stays OUTSIDE the
// try/catch — redirect() works by throwing, so catching it would swallow
// the navigation.
export async function createEvent(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");
  const allDay = formData.get("all_day") === "on";
  const scope = String(formData.get("scope") ?? "course");

  try {
    if (!title) return { error: "Give the event a title." };
    if (!startsAt) return { error: "Pick a start date and time." };

    // datetime-local values are Pacific wall-clock (see lib/timezone).
    const startsIso = pacificWallClockToUtcISO(startsAt);
    const endsIso = pacificWallClockToUtcISO(endsAt);
    if (!startsIso) return { error: "Enter a valid start time." };
    if (endsIso && new Date(endsIso) < new Date(startsIso)) {
      return { error: "The end time can't be before the start time." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Your session expired — refresh the page and sign in again." };
    }

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

    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the event." };
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}

// RLS re-enforces exec-only on calendar_events writes regardless of the
// UI gate — same pattern used throughout.
export async function updateEvent(
  eventId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "");
  const allDay = formData.get("all_day") === "on";
  const scope = String(formData.get("scope") ?? "course");

  try {
    if (!title) return { error: "Give the event a title." };

    const startsIso = pacificWallClockToUtcISO(startsAt);
    const endsIso = pacificWallClockToUtcISO(endsAt);
    if (!startsIso) return { error: "Enter a valid start time." };
    if (endsIso && new Date(endsIso) < new Date(startsIso)) {
      return { error: "The end time can't be before the start time." };
    }

    const supabase = await createClient();
    const course = await getCurrentCourse();

    const { error } = await supabase
      .from("calendar_events")
      .update({
        title,
        description: description || null,
        starts_at: startsIso,
        ends_at: endsIso,
        all_day: allDay,
        course_id: scope === "platform" ? null : (course?.id ?? null),
      })
      .eq("id", eventId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the event." };
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function deleteEvent(eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
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
