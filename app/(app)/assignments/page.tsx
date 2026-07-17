import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, oneOrFirst } from "@/lib/data/queries";
import Link from "next/link";

type Grade = { points_earned: number };
type AssignmentRow = {
  id: string;
  title: string;
  points_possible: number;
  due_at: string | null;
  assignment_group: { name: string; position: number } | null;
  submissions: { id: string; grades: Grade | Grade[] | null }[];
};

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return `Due ${new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export default async function AssignmentsPage() {
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const { data } = course
    ? await supabase
        .from("assignments")
        .select(
          `id, title, points_possible, due_at,
           assignment_group:assignment_groups(name, position),
           submissions(id, grades(points_earned))`,
        )
        .eq("course_id", course.id)
        .order("due_at", { ascending: true })
    : { data: null };

  const assignments = (data ?? []) as unknown as AssignmentRow[];

  const groups = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    const key = a.assignment_group?.name ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }
  const orderedGroups = [...groups.entries()].sort(
    (x, y) =>
      (assignments.find((a) => a.assignment_group?.name === x[0])
        ?.assignment_group?.position ?? 99) -
      (assignments.find((a) => a.assignment_group?.name === y[0])
        ?.assignment_group?.position ?? 99),
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-12">
      <h1 className="font-display text-2xl font-normal text-navy">
        Assignments
      </h1>
      <p className="mt-2 text-sm text-muted">
        {course?.name ?? "UREC Analyst Program"}
      </p>

      {orderedGroups.map(([groupName, items]) => (
        <div key={groupName} className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            {groupName}
          </h2>
          <ul className="mt-2 divide-y divide-hair border-t border-hair">
            {items.map((a) => {
              const grade = oneOrFirst(a.submissions[0]?.grades)?.points_earned;
              const submitted = a.submissions.length > 0;

              let status: string;
              let statusClass: string;
              if (isExec) {
                status = `${a.submissions.length} submitted`;
                statusClass = "text-muted";
              } else if (grade != null) {
                status = `${grade}/${a.points_possible} pts`;
                statusClass = "text-navy font-medium";
              } else if (submitted) {
                status = "Submitted";
                statusClass = "text-pos font-medium";
              } else {
                status = `— / ${a.points_possible} pts`;
                statusClass = "text-muted";
              }

              return (
                <li key={a.id}>
                  <Link
                    href={`/assignments/${a.id}`}
                    className="flex items-center justify-between py-3.5 transition-colors hover:bg-hair/40"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {fmtDue(a.due_at)}
                      </p>
                    </div>
                    <span className={`text-sm ${statusClass}`}>{status}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {assignments.length === 0 && (
        <p className="mt-8 text-sm text-muted">No assignments yet.</p>
      )}
    </div>
  );
}
