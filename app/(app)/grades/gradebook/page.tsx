import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { submissionStatus, STATUS_LABEL, STATUS_PILL } from "@/lib/submission-status";
import {
  buildCategories,
  categoriesToTotal,
  ATTENDED_STATUSES,
  type GroupMeta,
  type ItemScore,
  type AttendanceScore,
} from "@/lib/grade-model";
import Link from "next/link";
import { redirect } from "next/navigation";

type Grade = { points_earned: number };
type EnrollmentRow = {
  role: { name: string } | null;
  user: { id: string; full_name: string | null; email: string } | null;
};
type SubmissionRow = {
  assignment_id: string;
  user_id: string | null;
  group_id: string | null;
  submitted_at: string | null;
  grades: Grade | Grade[] | null;
};
type AssignmentCol = {
  id: string;
  title: string;
  points_possible: number;
  due_at: string | null;
  assignment_group_id: string | null;
};

// The exec/grader gradebook: a students × assignments matrix. RLS
// already lets exec and graders read every submission for a course, so
// this is purely a read-side aggregation — no special access path.
export default async function GradebookPage() {
  const course = await getCurrentCourse();
  if (!course) redirect("/dashboard");

  const [isExec, isGrader] = await Promise.all([getIsExec(), getIsGrader(course.id)]);
  if (!isExec && !isGrader) redirect("/grades");

  const supabase = await createClient();
  const [{ data: enrollData }, { data: assignData }, { data: groupData }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("role:roles(name), user:users(id, full_name, email)")
      .eq("course_id", course.id),
    supabase
      .from("assignments")
      .select("id, title, points_possible, due_at, assignment_group_id")
      .eq("course_id", course.id)
      .eq("published", true)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("assignment_groups")
      .select("id, name, weight_pct, position, kind")
      .eq("course_id", course.id)
      .order("position", { ascending: true }),
  ]);

  const assignments = (assignData ?? []) as unknown as AssignmentCol[];
  const assignmentIds = assignments.map((a) => a.id);
  const groups: GroupMeta[] = (
    (groupData ?? []) as { id: string; name: string; weight_pct: number; position: number; kind: string | null }[]
  ).map((g) => ({
    id: g.id,
    name: g.name,
    weight: Number(g.weight_pct),
    position: g.position,
    kind: g.kind === "attendance" ? "attendance" : "standard",
  }));

  // Quizzes assigned to a category count toward the grade. Their possible
  // points are the sum of their questions' points. Scores come from
  // quiz_submissions (exec RLS returns the whole course).
  const { data: quizData } = await supabase
    .from("quizzes")
    .select("id, assignment_group_id")
    .eq("course_id", course.id)
    .eq("published", true)
    .not("assignment_group_id", "is", null);
  const quizzes = (quizData ?? []) as { id: string; assignment_group_id: string | null }[];
  const quizIds = quizzes.map((q) => q.id);

  const [{ data: qQ }, { data: qSub }, { data: attData }] = await Promise.all([
    quizIds.length
      ? supabase.from("quiz_questions").select("quiz_id, points").in("quiz_id", quizIds)
      : Promise.resolve({ data: [] }),
    quizIds.length
      ? supabase.from("quiz_submissions").select("quiz_id, user_id, score").in("quiz_id", quizIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("attendance_records")
      .select("user_id, status, event:calendar_events!inner(course_id)")
      .eq("event.course_id", course.id),
  ]);

  // quiz_id → total possible points
  const quizPossible = new Map<string, number>();
  for (const q of (qQ ?? []) as { quiz_id: string; points: number }[]) {
    quizPossible.set(q.quiz_id, (quizPossible.get(q.quiz_id) ?? 0) + Number(q.points));
  }
  // `${quizId}:${userId}` → score
  const quizScore = new Map<string, number>();
  for (const s of (qSub ?? []) as { quiz_id: string; user_id: string; score: number | null }[]) {
    if (s.score != null) quizScore.set(`${s.quiz_id}:${s.user_id}`, Number(s.score));
  }
  // user_id → attendance tally (attended ÷ recorded sessions)
  const attendanceByUser = new Map<string, AttendanceScore>();
  for (const r of (attData ?? []) as { user_id: string; status: string }[]) {
    const a = attendanceByUser.get(r.user_id) ?? { attended: 0, held: 0 };
    a.held += 1;
    if (ATTENDED_STATUSES.has(r.status)) a.attended += 1;
    attendanceByUser.set(r.user_id, a);
  }

  // All submissions for these assignments (exec/grader RLS returns the
  // whole course). Individual submissions key by user; group submissions
  // are expanded to each member via group_memberships.
  const [{ data: subData }, { data: gmData }] = await Promise.all([
    assignmentIds.length
      ? supabase
          .from("submissions")
          .select("assignment_id, user_id, group_id, submitted_at, grades(points_earned)")
          .in("assignment_id", assignmentIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("group_memberships")
      .select("group_id, user_id, group:groups!inner(course_id)")
      .eq("group.course_id", course.id),
  ]);

  const submissions = (subData ?? []) as unknown as SubmissionRow[];
  const groupMembers = new Map<string, string[]>();
  for (const gm of (gmData ?? []) as { group_id: string; user_id: string }[]) {
    if (!groupMembers.has(gm.group_id)) groupMembers.set(gm.group_id, []);
    groupMembers.get(gm.group_id)!.push(gm.user_id);
  }

  // cell[`${assignmentId}:${userId}`] = { submittedAt, grade }
  const cell = new Map<string, { submittedAt: string | null; grade: number | null }>();
  const put = (aid: string, uid: string, submittedAt: string | null, grade: number | null) => {
    cell.set(`${aid}:${uid}`, { submittedAt, grade });
  };
  for (const s of submissions) {
    const grade = oneOrFirst(s.grades)?.points_earned ?? null;
    if (s.user_id) {
      put(s.assignment_id, s.user_id, s.submitted_at, grade);
    } else if (s.group_id) {
      for (const uid of groupMembers.get(s.group_id) ?? []) {
        put(s.assignment_id, uid, s.submitted_at, grade);
      }
    }
  }

  const students = ((enrollData ?? []) as unknown as EnrollmentRow[])
    .filter((e) => e.user)
    .sort((a, b) =>
      (a.user!.full_name ?? a.user!.email).localeCompare(b.user!.full_name ?? b.user!.email),
    );

  // Per-student running total — the SAME calculation the student /grades
  // page uses (shared buildCategories helper), so the two views never
  // disagree. Includes assignments, category-assigned quizzes, and the
  // attendance category.
  function studentTotal(uid: string) {
    const items: ItemScore[] = [];
    for (const a of assignments) {
      const c = cell.get(`${a.id}:${uid}`);
      if (!c || c.grade == null) continue;
      items.push({ groupId: a.assignment_group_id, earned: c.grade, possible: a.points_possible });
    }
    for (const q of quizzes) {
      const score = quizScore.get(`${q.id}:${uid}`);
      if (score == null) continue;
      items.push({
        groupId: q.assignment_group_id,
        earned: score,
        possible: quizPossible.get(q.id) ?? 0,
      });
    }
    return categoriesToTotal(buildCategories(groups, items, attendanceByUser.get(uid)));
  }

  return (
    <div className="w-full px-8 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-deep">Gradebook</h1>
            <p className="mt-1 text-sm text-muted">
              {course.name} &middot; {students.length} student{students.length === 1 ? "" : "s"} &middot;{" "}
              {assignments.length} published assignment{assignments.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            {isExec && (
              <Link
                href="/grades/weights"
                className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                Grade weights
              </Link>
            )}
            <Link
              href="/grades"
              className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              My Grades
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky first column, horizontal scroll for many assignments. */}
      <div className="mx-auto mt-6 max-w-6xl overflow-x-auto rounded-md border border-hair">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-[#f2f4f4]">
              <th className="sticky left-0 z-10 bg-[#f2f4f4] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                Student
              </th>
              {assignments.map((a) => (
                <th key={a.id} className="px-3 py-3 text-center text-xs font-semibold text-navy-deep">
                  <Link href={`/assignments/${a.id}/grade`} className="hover:underline">
                    {a.title}
                  </Link>
                  <span className="mt-0.5 block font-normal text-muted">{a.points_possible} pts</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((e) => {
              const uid = e.user!.id;
              const total = studentTotal(uid);
              return (
                <tr key={uid} className="border-t border-hair">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-2.5">
                    <span className="block font-medium text-text">
                      {e.user!.full_name ?? e.user!.email}
                    </span>
                    <span className="block text-xs text-muted">{e.role?.name ?? "Member"}</span>
                  </td>
                  {assignments.map((a) => {
                    const c = cell.get(`${a.id}:${uid}`);
                    const status = submissionStatus({
                      dueAt: a.due_at,
                      submittedAt: c?.submittedAt,
                      graded: c?.grade != null,
                    });
                    return (
                      <td key={a.id} className="px-3 py-2.5 text-center">
                        {c?.grade != null ? (
                          <span className="font-medium text-navy-deep">{c.grade}</span>
                        ) : status === "missing" || status === "late" ? (
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[status]}`}
                          >
                            {STATUS_LABEL[status]}
                          </span>
                        ) : c?.submittedAt ? (
                          <span className="text-xs text-pos">Submitted</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-center font-semibold text-navy-deep">
                    {total != null ? `${total.toFixed(0)}%` : "—"}
                  </td>
                </tr>
              );
            })}
            {students.length === 0 && (
              <tr>
                <td colSpan={assignments.length + 2} className="px-4 py-6 text-sm text-muted">
                  No students enrolled yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
