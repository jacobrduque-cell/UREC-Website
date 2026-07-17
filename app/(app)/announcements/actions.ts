"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { getCourseMemberIds, notifyUsers } from "@/lib/notifications";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";

  if (!title || !body) {
    throw new Error("Title and body are required.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  // RLS re-enforces exec-only on this insert regardless of the UI gate —
  // this isn't the only thing standing between a non-exec user and
  // posting.
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      course_id: course.id,
      author_id: user.id,
      title,
      body,
      pinned,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const memberIds = await getCourseMemberIds(course.id, user.id);
  await notifyUsers(memberIds, {
    type: "new_announcement",
    title: `New announcement: ${title}`,
    body: body.slice(0, 140),
    relatedEntityType: "announcement",
    relatedEntityId: data.id,
  });

  revalidatePath("/announcements");
  redirect(`/announcements/${data.id}`);
}

export async function createReply(announcementId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("announcement_replies").insert({
    announcement_id: announcementId,
    author_id: user.id,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/announcements/${announcementId}`);
}
