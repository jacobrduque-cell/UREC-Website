import { createAdminClient } from "@/lib/supabase/admin";
import { getCourseMemberIds, notifyUsers } from "@/lib/notifications";
import { pacificWallClockToUtcISO } from "@/lib/timezone";
import { NextResponse } from "next/server";

/**
 * "Assignment due tomorrow" — the third of the four notification
 * triggers named in the decision log. Runs once a day via Vercel Cron
 * (see vercel.json), not tied to any user action, so it's the one
 * trigger that has to live as a scheduled route rather than inside a
 * server action.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // "Tomorrow" must mean the Pacific calendar day, not the UTC one —
  // due_at is stored as Pacific wall-clock in UTC, so a UTC day-boundary
  // window would clip evening-Pacific deadlines (they roll into the next
  // UTC date) and remind a day early or skip them. Compute tomorrow's
  // Pacific date, then convert its 00:00 and 23:59 Pacific bounds to UTC.
  const now = new Date();
  const pacificToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  const [ty, tm, td] = pacificToday.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(ty, tm - 1, td + 1));
  const tomorrowDate = `${tomorrow.getUTCFullYear()}-${String(
    tomorrow.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`;
  const windowStart = pacificWallClockToUtcISO(`${tomorrowDate}T00:00`)!;
  const windowEnd = pacificWallClockToUtcISO(`${tomorrowDate}T23:59`)!;

  const { data: dueSoon } = await admin
    .from("assignments")
    .select("id, title, course_id")
    .eq("published", true)
    .gte("due_at", windowStart)
    .lte("due_at", windowEnd);

  let notified = 0;

  for (const assignment of dueSoon ?? []) {
    const [memberIds, { data: submissions }, { data: alreadySent }] =
      await Promise.all([
        getCourseMemberIds(assignment.course_id),
        admin
          .from("submissions")
          .select("user_id, group_id")
          .eq("assignment_id", assignment.id),
        admin
          .from("notifications")
          .select("user_id")
          .eq("type", "assignment_due_soon")
          .eq("related_entity_id", assignment.id)
          .gte(
            "created_at",
            new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
          ),
      ]);

    const submittedUserIds = new Set(
      (submissions ?? []).map((s) => s.user_id).filter(Boolean),
    );
    const groupIds = (submissions ?? [])
      .map((s) => s.group_id)
      .filter((id): id is string => Boolean(id));
    if (groupIds.length > 0) {
      const { data: groupMembers } = await admin
        .from("group_memberships")
        .select("user_id")
        .in("group_id", groupIds);
      for (const gm of groupMembers ?? []) submittedUserIds.add(gm.user_id);
    }

    const alreadySentIds = new Set((alreadySent ?? []).map((n) => n.user_id));

    const recipients = memberIds.filter(
      (id) => !submittedUserIds.has(id) && !alreadySentIds.has(id),
    );

    if (recipients.length > 0) {
      await notifyUsers(recipients, {
        type: "assignment_due_soon",
        title: `${assignment.title} is due tomorrow`,
        relatedEntityType: "assignment",
        relatedEntityId: assignment.id,
      });
      notified += recipients.length;
    }
  }

  // Scheduled announcements (Phase 6): createAnnouncement() skips
  // notifying when published_at is in the future, so this sweep is
  // what actually notifies once that time passes. Vercel's Hobby plan
  // only allows a daily cron, so a "publish at 9am" announcement is
  // delivered same-day rather than at that exact minute — a documented
  // simplification, not a bug.
  const { data: justPublished } = await admin
    .from("announcements")
    .select("id, title, body, course_id, author_id")
    .lte("published_at", now.toISOString())
    .gte("published_at", new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString());

  let announcementsNotified = 0;
  for (const announcement of justPublished ?? []) {
    const { data: alreadySent } = await admin
      .from("notifications")
      .select("id")
      .eq("type", "new_announcement")
      .eq("related_entity_id", announcement.id)
      .limit(1);
    if (alreadySent && alreadySent.length > 0) continue;

    const memberIds = await getCourseMemberIds(announcement.course_id, announcement.author_id);
    await notifyUsers(memberIds, {
      type: "new_announcement",
      title: `New announcement: ${announcement.title}`,
      body: announcement.body.slice(0, 140),
      relatedEntityType: "announcement",
      relatedEntityId: announcement.id,
    });
    announcementsNotified += memberIds.length;
  }

  return NextResponse.json({
    assignments: dueSoon?.length ?? 0,
    notified,
    announcementsNotified,
  });
}
