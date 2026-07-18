import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

type EnrollmentRow = {
  role: { name: string } | null;
  section: { name: string } | null;
  user: { id: string; full_name: string | null; email: string } | null;
};

// Program progress: rolls up the three advancement signals the club
// actually tracks — attendance, graded assignments, and quizzes — into
// one exec grid so "who's on track?" is answerable at a glance instead of
// cross-referencing three screens for 115 people. Pure read-side
// aggregation; RLS already lets exec/graders read all of it.
export default async function ProgressPage() {
  const course = await getCurrentCourse();
  if (!course) redirect("/dashboard");
  const [isExec, isGrader] = await Promise.all([getIsExec(), getIsGrader(course.id)]);
  if (!isExec && !isGrader) redirect("/directory");

  const supabase = await createClient();

  // Roster + the three content dimensions (published only), in parallel.
  const [{ data: enrollData }, { data: eventRows }, { data: assignRows }, { data: quizRows }, { data: gmRows }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("role:roles(name), section:course_sections(name), user:users(id, full_name, email)")
        .eq("course_id", course.id),
      supabase.from("calendar_events").select("id").eq("course_id", course.id),
      supabase.from("assignments").select("id").eq("course_id", course.id).eq("published", true),
      supabase.from("quizzes").select("id").eq("course_id", course.id).eq("published", true),
      supabase
        .from("group_memberships")
        .select("group_id, user_id, group:groups!inner(course_id)")
        .eq("group.course_id", course.id),
    ]);

  const eventIds = (eventRows ?? []).map((e) => e.id as string);
  const assignmentIds = (assignRows ?? []).map((a) => a.id as string);
  const quizIds = (quizRows ?? []).map((q) => q.id as string);
  const totalAssignments = assignmentIds.length;
  const totalQuizzes = quizIds.length;

  // group_id -> member user_ids, so a team submission counts for everyone.
  const groupMembers = new Map<string, string[]>();
  for (const gm of (gmRows ?? []) as { group_id: string; user_id: string }[]) {
    if (!groupMembers.has(gm.group_id)) groupMembers.set(gm.group_id, []);
    groupMembers.get(gm.group_id)!.push(gm.user_id);
  }

  // Fetch the per-dimension detail rows only when there's something to
  // count (avoids a `.in(..., [])` that returns everything).
  const [{ data: attRows }, { data: subRows }, { data: qsRows }] = await Promise.all([
    eventIds.length
      ? supabase.from("attendance_records").select("event_id, user_id, status").in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    assignmentIds.length
      ? supabase
          .from("submissions")
          .select("assignment_id, user_id, group_id, grades(points_earned)")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] }),
    quizIds.length
      ? supabase.from("quiz_submissions").select("quiz_id, user_id, submitted_at").in("quiz_id", quizIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Attendance: present or late counts as "there". Denominator is the
  // number of meetings attendance was actually taken for, not every event.
  const meetingsTaken = new Set<string>();
  const present = new Map<string, number>();
  for (const r of (attRows ?? []) as { event_id: string; user_id: string; status: string }[]) {
    meetingsTaken.add(r.event_id);
    if (r.status === "present" || r.status === "late") {
      present.set(r.user_id, (present.get(r.user_id) ?? 0) + 1);
    }
  }
  const totalMeetings = meetingsTaken.size;

  // Assignments: a submission (own or via the user's group) counts for
  // each member; graded is a strict subset.
  const submitted = new Map<string, Set<string>>();
  const graded = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, uid: string, aid: string) => {
    if (!m.has(uid)) m.set(uid, new Set());
    m.get(uid)!.add(aid);
  };
  for (const s of (subRows ?? []) as {
    assignment_id: string;
    user_id: string | null;
    group_id: string | null;
    grades: { points_earned: number } | { points_earned: number }[] | null;
  }[]) {
    const recipients = s.user_id ? [s.user_id] : (s.group_id ? groupMembers.get(s.group_id) ?? [] : []);
    const isGraded = oneOrFirst(s.grades)?.points_earned != null;
    for (const uid of recipients) {
      add(submitted, uid, s.assignment_id);
      if (isGraded) add(graded, uid, s.assignment_id);
    }
  }

  // Quizzes: count distinct quizzes the user actually submitted.
  const quizzesDone = new Map<string, Set<string>>();
  for (const qs of (qsRows ?? []) as { quiz_id: string; user_id: string; submitted_at: string | null }[]) {
    if (qs.submitted_at) add(quizzesDone, qs.user_id, qs.quiz_id);
  }

  const students = ((enrollData ?? []) as unknown as EnrollmentRow[])
    .filter((e) => e.user)
    .sort((a, b) =>
      (a.user!.full_name ?? a.user!.email).localeCompare(b.user!.full_name ?? b.user!.email),
    );

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

  return (
    <div className="w-full px-8 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-deep">Program Progress</h1>
            <p className="mt-1 text-sm text-muted">
              {course.name} &middot; {students.length} member{students.length === 1 ? "" : "s"} &middot;{" "}
              {totalMeetings} meeting{totalMeetings === 1 ? "" : "s"} &middot; {totalAssignments} assignment
              {totalAssignments === 1 ? "" : "s"} &middot; {totalQuizzes} quiz{totalQuizzes === 1 ? "" : "zes"}
            </p>
          </div>
          <Link
            href="/directory"
            className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            People
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto rounded-md border border-hair">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-[#f2f4f4] text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 text-left font-semibold">Member</th>
                <th className="px-4 py-3 text-center font-semibold">Attendance</th>
                <th className="px-4 py-3 text-center font-semibold">Assignments graded</th>
                <th className="px-4 py-3 text-center font-semibold">Quizzes done</th>
              </tr>
            </thead>
            <tbody>
              {students.map((e) => {
                const uid = e.user!.id;
                const att = present.get(uid) ?? 0;
                const gradedCount = graded.get(uid)?.size ?? 0;
                const quizCount = quizzesDone.get(uid)?.size ?? 0;
                const attPct = pct(att, totalMeetings);
                return (
                  <tr key={uid} className="border-t border-hair">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="block font-medium text-text">
                        {e.user!.full_name ?? e.user!.email}
                      </span>
                      <span className="block text-xs text-muted">
                        {e.section?.name ? `${e.section.name} · ` : ""}
                        {e.role?.name ?? "Member"}
                      </span>
                    </td>
                    <Cell value={att} total={totalMeetings} pct={attPct} lowThreshold={70} />
                    <Cell value={gradedCount} total={totalAssignments} pct={pct(gradedCount, totalAssignments)} lowThreshold={50} />
                    <Cell value={quizCount} total={totalQuizzes} pct={pct(quizCount, totalQuizzes)} lowThreshold={50} />
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-muted">
                    No members enrolled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mx-auto mt-3 max-w-5xl text-xs text-muted">
          Attendance counts &ldquo;present&rdquo; and &ldquo;late&rdquo; over meetings where attendance was
          taken. Team submissions count for every group member. Red flags a member below the bar.
        </p>
      </div>
    </div>
  );
}

function Cell({
  value,
  total,
  pct,
  lowThreshold,
}: {
  value: number;
  total: number;
  pct: number | null;
  lowThreshold: number;
}) {
  const low = pct != null && pct < lowThreshold;
  return (
    <td className="px-4 py-2.5 text-center">
      {total === 0 ? (
        <span className="text-muted">—</span>
      ) : (
        <span className={low ? "font-medium text-neg" : "text-text"}>
          {value}/{total}
          <span className="ml-1 text-xs text-muted">({pct}%)</span>
        </span>
      )}
    </td>
  );
}
