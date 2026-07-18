"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { getCourseMemberIds, notifyUsers } from "@/lib/notifications";
import { pacificWallClockToUtcISO } from "@/lib/timezone";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";
  const locked = formData.get("locked") === "on";
  const publishAtRaw = String(formData.get("publish_at") ?? "");

  let newId = "";
  try {
    if (!title) {
      return { error: "Give your announcement a title before posting." };
    }
    if (!body) {
      return { error: "Add a message — the announcement body can't be empty." };
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
    if (!user) {
      return { error: "Your session expired — refresh the page and sign in again." };
    }

    const course = await getCurrentCourse();
    if (!course) {
      return {
        error:
          "No active course is set, so there's nowhere to post this. Pick or start a course first.",
      };
    }

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
      return { error: error.message };
    }

    newId = data.id;

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
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't post the announcement. Try again.",
    };
  }

  revalidatePath("/announcements");
  redirect(`/announcements/${newId}`);
}

// Edit an existing announcement. Never re-notifies — an edit is a
// correction, not a new post. RLS re-enforces exec-only on the write.
export async function updateAnnouncement(
  announcementId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const pinned = formData.get("pinned") === "on";
  const locked = formData.get("locked") === "on";

  try {
    if (!title) {
      return { error: "Give your announcement a title." };
    }
    if (!body) {
      return { error: "Add a message — the announcement body can't be empty." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("announcements")
      .update({ title, body, pinned, locked })
      .eq("id", announcementId);
    if (error) {
      return { error: error.message };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't save your changes. Try again.",
    };
  }

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${announcementId}`);
  redirect(`/announcements/${announcementId}`);
}

export async function deleteAnnouncement(announcementId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", announcementId);
  if (error) throw new Error(error.message);

  revalidatePath("/announcements");
  redirect("/announcements");
}

export async function createReply(
  announcementId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const body = String(formData.get("body") ?? "").trim();

  try {
    if (!body) {
      return { error: "Write something before posting your reply." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Your session expired — refresh the page and sign in again." };
    }

    const { error } = await supabase.from("announcement_replies").insert({
      announcement_id: announcementId,
      author_id: user.id,
      body,
    });

    if (error) {
      return { error: error.message };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't post your reply. Try again.",
    };
  }

  revalidatePath(`/announcements/${announcementId}`);
  return {};
}
