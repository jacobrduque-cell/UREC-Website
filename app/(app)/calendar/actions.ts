"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
    starts_at: new Date(startsAt).toISOString(),
    ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    all_day: allDay,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
  redirect("/calendar");
}
