"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { getCourseMemberIds, notifyUsers } from "@/lib/notifications";
import { pacificWallClockToUtcISO } from "@/lib/timezone";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";
  const locked = formData.get("locked") === "on";
  const publishAtRaw = String(formData.get("publish_at") ?? "");

  if (!title || !body) {
    throw new Error("Title and body are required.");
  }

  // publish_at is a Pacific wall-clock datetime-local value (see
  // lib/timezone) — parse it in the club zone so "schedule for 9 AM"
  // means 9 AM Berkeley, not 9 AM UTC (2 AM Pacific).
  const now = new Date();
  const publishIso = pacificWallClockToUtcISO(publishAtRaw);
  const publishAt = publishIso ? new Date(publishIso) : now;
  const isScheduledForLater = publishAt.getTime() > now.getTime();

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
      locked,
      published_at: publishAt.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // A future publish_at means nobody should be notified yet — the
  // daily assignment-reminders cron also sweeps for announcements
  // whose scheduled time has since passed and notifies then instead
  // (see app/api/cron/assignment-reminders/route.ts).
  if (!isScheduledForLater) {
    const memberIds = await getCourseMemberIds(course.id, user.id);
    await notifyUsers(memberIds, {
      type: "new_announcement",
      title: `New announcement: ${title}`,
      body: body.slice(0, 140),
      relatedEntityType: "announcement",
      relatedEntityId: data.id,
    });
  }

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
