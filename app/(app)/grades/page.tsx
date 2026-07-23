import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsStaff, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import {
  buildCategories,
  categoriesToTotal,
  ATTENDED_STATUSES,
  type GroupMeta,
  type ItemScore,
  type AttendanceScore,
} from "@/lib/grade-model";
import Link from "next/link";

type Grade = { points_earned: number };
type AssignmentRow = {
  id: string;
  title: string;
  points_possible: number;
  assignment_group_id: string | null;
};
type SubmissionRow = { assignment_id: string; grades: Grade | Grade[] | null };

export default async function GradesPage() {
  const course = await getCurrentCourse();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [isExec, isStaff, isGrader] = await Promise.all([
    getIsExec(),
    getIsStaff(),
    course ? getIsGrader(course.id) : Promise.resolve(false),
  ]);
  // Staff/graders get the Gradebook; the Grade-weights button stays exec-only.
  const canManage = isStaff || isGrader;

  // Categories (with weights) + published assignments.
  let groupData: unknown = null;
  let assignmentData: unknown = null;
  if (course) {
    const [gRes, aRes] = await Promise.all([
      supabase
        .from("assignment_groups")
        .select("id, name, weight_pct, position, kind")
        .eq("course_id", course.id)
        .order("position", { ascending: true }),
      supabase
        .from("assignments")
        .select("id, title, points_possible, assignment_group_id, due_at")
        // Only published, stable order — must match the exec gradebook so the
        // two views compute the identical weighted total.
        .eq("course_id", course.id)
        .eq("published", true)
        .order("due_at", { ascending: true, nullsFirst: false }),
    ]);
    groupData = gRes.data;
    assignmentData = aRes.data;
  }

  const groups: GroupMeta[] = (
    (groupData ?? []) as { id: string; name: string; weight_pct: number; position: number; kind: string | null }[]
  ).map((g) => ({
    id: g.id,
    name: g.name,
    weight: Number(g.weight_pct),
    position: g.position,
    kind: g.kind === "attendance" ? "attendance" : "standard",
  }));
  const assignments = (assignmentData ?? []) as unknown as AssignmentRow[];

  // The viewer's group ids in this course, so group submissions count.
  const myGroupIds: string[] = [];
  if (course && user) {
    const { data: gm } = await supabase
      .from("group_memberships")
      .select("group_id, group:groups!inner(course_id)")
      .eq("user_id", user.id)
      .eq("group.course_id", course.id);
    for (const row of gm ?? []) myGroupIds.push((row as { group_id: string }).group_id);
  }

  // Grade per assignment for THIS viewer (own or group submission).
  const gradeByAssignment = new Map<string, number>();
  if (course && user && assignments.length > 0) {
    const orFilter =
      myGroupIds.length > 0
        ? `user_id.eq.${user.id},group_id.in.(${myGroupIds.join(",")})`
        : `user_id.eq.${user.id}`;
    const { data: subs } = await supabase
      .from("submissions")
      .select("assignment_id, grades(points_earned)")
      .in(
        "assignment_id",
        assignments.map((a) => a.id),
      )
      .or(orFilter);
    for (const s of (subs ?? []) as unknown as SubmissionRow[]) {
      const g = oneOrFirst(s.grades)?.points_earned;
      if (g != null) gradeByAssignment.set(s.assignment_id, g);
    }
  }

  // Category-assigned quizzes + the viewer's scores.
  type QuizRow = {
    id: string;
    title: string;
    assignment_group_id: string | null;
    possible: number;
    score: number | null;
  };
  const quizRows: QuizRow[] = [];
  if (course && user) {
    const { data: qData } = await supabase
      .from("quizzes")
      .select("id, title, assignment_group_id")
      .eq("course_id", course.id)
      .eq("published", true)
      .not("assignment_group_id", "is", null);
    const quizzes = (qData ?? []) as { id: string; title: string; assignment_group_id: string | null }[];
    const quizIds = quizzes.map((q) => q.id);
    if (quizIds.length) {
      const [{ data: qQ }, { data: mySubs }] = await Promise.all([
        supabase.from("quiz_questions").select("quiz_id, points").in("quiz_id", quizIds),
        supabase.from("quiz_submissions").select("quiz_id, score").eq("user_id", user.id).in("quiz_id", quizIds),
      ]);
      const possible = new Map<string, number>();
      for (const q of (qQ ?? []) as { quiz_id: string; points: number }[]) {
        possible.set(q.quiz_id, (possible.get(q.quiz_id) ?? 0) + Number(q.points));
      }
      const scoreByQuiz = new Map<string, number>();
      for (const s of (mySubs ?? []) as { quiz_id: string; score: number | null }[]) {
        if (s.score != null) scoreByQuiz.set(s.quiz_id, Number(s.score));
      }
      for (const q of quizzes) {
        quizRows.push({
          id: q.id,
          title: q.title,
          assignment_group_id: q.assignment_group_id,
          possible: possible.get(q.id) ?? 0,
          score: scoreByQuiz.has(q.id) ? scoreByQuiz.get(q.id)! : null,
        });
      }
    }
  }

  // The viewer's attendance tally (attended ÷ sessions they were recorded at).
  let attendance: AttendanceScore | undefined;
  if (course && user) {
    const { data: att } = await supabase
      .from("attendance_records")
      .select("status, event:calendar_events!inner(course_id)")
      .eq("user_id", user.id)
      .eq("event.course_id", course.id);
    const rows = (att ?? []) as { status: string }[];
    if (rows.length) {
      attendance = {
        attended: rows.filter((r) => ATTENDED_STATUSES.has(r.status)).length,
        held: rows.length,
      };
    }
  }

  // Build category totals (shared with the exec gradebook).
  const items: ItemScore[] = [];
  for (const a of assignments) {
    const g = gradeByAssignment.get(a.id);
    if (g != null) items.push({ groupId: a.assignment_group_id, earned: g, possible: a.points_possible });
  }
  for (const q of quizRows) {
    if (q.score != null) items.push({ groupId: q.assignment_group_id, earned: q.score, possible: q.possible });
  }
  const categoryLines = buildCategories(groups, items, attendance);
  const weightedTotal = categoriesToTotal(categoryLines);

  const groupName = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">Grades</h1>
          <p className="mt-2 text-sm text-muted">{course?.name ?? "UREC Analyst Program"}</p>
        </div>
        {canManage && (
          <div className="flex flex-shrink-0 gap-2">
            {isExec && (
              <Link
                href="/grades/weights"
                className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                Grade weights
              </Link>
            )}
            <Link
              href="/grades/gradebook"
              className="whitespace-nowrap rounded-md bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              Gradebook
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-md border border-hair">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper-warm text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-semibold">Item</th>
              <th className="px-4 py-2.5 text-right font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const grade = gradeByAssignment.get(a.id);
              return (
                <tr key={a.id} className="border-t border-hair">
                  <td className="px-4 py-2.5 text-text">
                    {a.title}
                    <span className="ml-2 text-xs text-muted">
                      {a.assignment_group_id ? groupName.get(a.assignment_group_id) : "Ungrouped"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-text">
                    {grade != null ? `${grade}/${a.points_possible}` : `—/${a.points_possible}`}
                  </td>
                </tr>
              );
            })}
            {quizRows.map((q) => (
              <tr key={q.id} className="border-t border-hair">
                <td className="px-4 py-2.5 text-text">
                  {q.title}
                  <span className="ml-2 text-xs text-muted">
                    Quiz &middot; {q.assignment_group_id ? groupName.get(q.assignment_group_id) : "Ungrouped"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-text">
                  {q.score != null ? `${q.score}/${q.possible}` : `—/${q.possible}`}
                </td>
              </tr>
            ))}
            {assignments.length === 0 && quizRows.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={2}>
                  No graded items yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-md border border-hair bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Weighted Categories</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {categoryLines.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-sm">
              <span className="text-text">
                {c.name} ({c.weight}%)
              </span>
              <span className="text-muted">
                {!c.hasData
                  ? c.kind === "attendance"
                    ? "No sessions yet"
                    : "No grades yet"
                  : c.kind === "attendance"
                    ? `${c.earned}/${c.possible} sessions`
                    : `${c.earned}/${c.possible} pts`}
              </span>
            </li>
          ))}
          {categoryLines.length === 0 && (
            <li className="text-sm text-muted">No categories set up yet.</li>
          )}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-hair pt-4">
          <span className="font-medium text-navy">Total</span>
          <span className="font-display text-lg font-bold text-navy-deep">
            {weightedTotal != null ? `${weightedTotal.toFixed(2)}%` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
