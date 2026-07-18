import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { overallPercent } from "@/lib/grade-weighting";
import Link from "next/link";

type Grade = { points_earned: number };
type AssignmentRow = {
  id: string;
  title: string;
  points_possible: number;
  assignment_group: { name: string; weight_pct: number; position: number } | null;
  submissions: { grades: Grade | Grade[] | null }[];
};

export default async function GradesPage() {
  const course = await getCurrentCourse();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [isExec, isGrader] = await Promise.all([
    getIsExec(),
    course ? getIsGrader(course.id) : Promise.resolve(false),
  ]);
  const canManage = isExec || isGrader;

  // This is a personal "my grades" view, not a gradebook — the
  // submissions embed is explicitly scoped to the viewer's own row so
  // a grader/exec who happens to also be enrolled never sees someone
  // else's grade mixed in (RLS alone now lets graders see every
  // student's submissions, so it can't be relied on to narrow this).
  const { data } =
    course && user
      ? await supabase
          .from("assignments")
          .select(
            `id, title, points_possible,
             assignment_group:assignment_groups(name, weight_pct, position),
             submissions(grades(points_earned))`,
          )
          .eq("course_id", course.id)
          .eq("submissions.user_id", user.id)
      : { data: null };

  const assignments = (data ?? []) as unknown as AssignmentRow[];

  type CategoryTotals = {
    name: string;
    weight: number;
    position: number;
    earned: number;
    possible: number;
    hasGraded: boolean;
  };
  const categories = new Map<string, CategoryTotals>();

  for (const a of assignments) {
    const name = a.assignment_group?.name ?? "Ungrouped";
    const weight = a.assignment_group?.weight_pct ?? 0;
    const position = a.assignment_group?.position ?? 99;
    if (!categories.has(name)) {
      categories.set(name, {
        name,
        weight,
        position,
        earned: 0,
        possible: 0,
        hasGraded: false,
      });
    }
    const grade = oneOrFirst(a.submissions[0]?.grades)?.points_earned;
    if (grade != null) {
      const cat = categories.get(name)!;
      cat.earned += grade;
      cat.possible += a.points_possible;
      cat.hasGraded = true;
    }
  }

  const categoryList = [...categories.values()].sort(
    (a, b) => a.position - b.position,
  );
  // Shared with the exec gradebook so the two views always agree.
  const weightedTotal = overallPercent(
    categoryList.map((c) => ({ weight: c.weight, earned: c.earned, possible: c.possible })),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">Grades</h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        {canManage && (
          <Link
            href="/grades/gradebook"
            className="whitespace-nowrap rounded-md bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Gradebook
          </Link>
        )}
      </div>

      <div className="mt-8 overflow-hidden rounded-md border border-hair">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-paper-warm text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-semibold">Assignment</th>
              <th className="px-4 py-2.5 text-right font-semibold">Score</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const grade = oneOrFirst(a.submissions[0]?.grades)?.points_earned;
              return (
                <tr key={a.id} className="border-t border-hair">
                  <td className="px-4 py-2.5 text-text">
                    {a.title}
                    <span className="ml-2 text-xs text-muted">
                      {a.assignment_group?.name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-text">
                    {grade != null ? `${grade}/${a.points_possible}` : `—/${a.points_possible}`}
                  </td>
                </tr>
              );
            })}
            {assignments.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-muted" colSpan={2}>
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-md border border-hair bg-white p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Weighted Categories
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {categoryList.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-text">
                {c.name} ({c.weight}%)
              </span>
              <span className="text-muted">
                {c.hasGraded
                  ? `${c.earned}/${c.possible} pts`
                  : "No grades yet"}
              </span>
            </li>
          ))}
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
