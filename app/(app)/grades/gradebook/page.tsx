import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { submissionStatus, STATUS_LABEL, STATUS_PILL } from "@/lib/submission-status";
import { overallPercent } from "@/lib/grade-weighting";
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
  assignment_group: { weight_pct: number } | null;
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
  const [{ data: enrollData }, { data: assignData }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("role:roles(name), user:users(id, full_name, email)")
      .eq("course_id", course.id),
    supabase
      .from("assignments")
      .select("id, title, points_possible, due_at, assignment_group_id, assignment_group:assignment_groups(weight_pct)")
      .eq("course_id", course.id)
      .eq("published", true)
      .order("due_at", { ascending: true, nullsFirst: false }),
  ]);

  const assignments = (assignData ?? []) as unknown as AssignmentCol[];
  const assignmentIds = assignments.map((a) => a.id);

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

  // Per-student running total, weighted by assignment-group weight_pct —
  // the SAME calculation the student /grades page uses (shared helper), so
  // the two views never disagree.
  function studentTotal(uid: string) {
    const byCategory = new Map<string, { weight: number; earned: number; possible: number }>();
    for (const a of assignments) {
      const c = cell.get(`${a.id}:${uid}`);
      if (!c || c.grade == null) continue;
      const weight = oneOrFirst(a.assignment_group)?.weight_pct ?? 0;
      // Key by the group's identity (ungrouped pooled under "none"), so two
      // distinct categories that happen to share a weight stay separate.
      const key = a.assignment_group_id ?? "none";
      if (!byCategory.has(key)) byCategory.set(key, { weight, earned: 0, possible: 0 });
      const cat = byCategory.get(key)!;
      cat.earned += c.grade;
      cat.possible += a.points_possible;
    }
    return overallPercent([...byCategory.values()]);
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
          <Link
            href="/grades"
            className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            My Grades
          </Link>
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
