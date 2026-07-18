import { createAdminClient } from "@/lib/supabase/admin";
import { buildIcs } from "@/lib/ical";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Public calendar subscribe feed — no user session, since calendar apps
 * (Google Calendar, Apple Calendar) poll this URL on their own schedule
 * with no cookies. Auth is the per-user token in the URL instead (see
 * generateCalendarFeedToken in calendar/actions.ts); proxy.ts already
 * exempts all of /api/* from session-based gating for this reason.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("api_tokens")
    .select("id, user_id, expires_at, scopes")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  const scopes = (tokenRow?.scopes ?? []) as string[];
  const isExpired =
    tokenRow?.expires_at != null && new Date(tokenRow.expires_at) < new Date();
  if (!tokenRow || isExpired || !scopes.includes("calendar:read")) {
    return NextResponse.json({ error: "Invalid or expired feed token" }, { status: 401 });
  }

  await admin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  const { data: course } = await admin
    .from("courses")
    .select("id, name, term:terms!inner(is_current)")
    .eq("terms.is_current", true)
    .limit(1)
    .maybeSingle();

  // The admin client bypasses RLS, so calendar_events_select_visible_or_exec
  // (course events need enrollment or exec) has to be re-checked by hand
  // here for the token's owning user — otherwise any signed-in-but-
  // unenrolled account could mint a token and read course-scoped events
  // it could never see through the actual app.
  let canSeeCourseEvents = false;
  if (course) {
    const [{ data: enrollment }, { data: execRow }] = await Promise.all([
      admin
        .from("enrollments")
        .select("id")
        .eq("user_id", tokenRow.user_id)
        .eq("course_id", course.id)
        .maybeSingle(),
      admin
        .from("account_roles")
        .select("id, roles!inner(name)")
        .eq("user_id", tokenRow.user_id)
        .in("roles.name", ["Admin", "Co-President", "VP"])
        .maybeSingle(),
    ]);
    canSeeCourseEvents = Boolean(enrollment) || Boolean(execRow);
  }

  // Only publish roughly the last two months plus everything upcoming.
  // Calendar apps re-fetch this feed on every poll, so an unbounded
  // multi-year history would grow without limit across cohorts and get
  // re-serialized to all ~115 subscribers on each refresh.
  const lowerBound = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await admin
    .from("calendar_events")
    .select("id, title, description, starts_at, ends_at, all_day, course_id")
    .or(
      course && canSeeCourseEvents
        ? `course_id.eq.${course.id},course_id.is.null`
        : "course_id.is.null",
    )
    .gte("starts_at", lowerBound)
    .order("starts_at", { ascending: true });

  const ics = buildIcs(course?.name ?? "UREC Platform", events ?? []);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
    },
  });
}
