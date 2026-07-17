import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const isGrader = course ? await getIsGrader(course.id) : false;
  const canManage = isExec || isGrader;

  // Graders/exec see every student's submissions (for the "N submitted"
  // count); everyone else's embed is explicitly scoped to their own row
  // so it can never show someone else's grade — RLS alone now lets
  // graders see the whole course's submissions, so this can't rely on
  // RLS narrowing it down implicitly the way it used to for plain members.
  let query = course
    ? supabase
        .from("assignments")
        .select(
          `id, title, points_possible, due_at,
           assignment_group:assignment_groups(name, position),
           submissions(id, grades(points_earned))`,
        )
        .eq("course_id", course.id)
        .order("due_at", { ascending: true })
    : null;
  if (query && !canManage && user) {
    query = query.eq("submissions.user_id", user.id);
  }
  const { data } = query ? await query : { data: null };

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">
            Assignments
          </h1>
          <p className="mt-2 text-sm text-muted">
            {course?.name ?? "UREC Analyst Program"}
          </p>
        </div>
        {isExec && (
          <Link
            href="/assignments/new"
            className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            New Assignment
          </Link>
        )}
      </div>

      {orderedGroups.map(([groupName, items]) => (
        <div key={groupName} className="mt-8">
          {/* bCourses assignment-group block: a bordered card with a
              grey group header, then rows carrying a green status bar on
              the left, a type icon, a bold title, and a due/points line. */}
          <div className="overflow-hidden rounded-md border border-hair">
            <div className="bg-[#f2f4f4] px-4 py-2.5">
              <h2 className="text-sm font-bold text-navy-deep">{groupName}</h2>
            </div>
            <ul className="divide-y divide-hair">
              {items.map((a) => {
                const grade = oneOrFirst(a.submissions[0]?.grades)?.points_earned;
                const submitted = a.submissions.length > 0;

                let status: string;
                let statusClass: string;
                if (canManage) {
                  status = `${a.submissions.length} submitted`;
                  statusClass = "text-muted";
                } else if (grade != null) {
                  status = `${grade}/${a.points_possible} pts`;
                  statusClass = "text-navy-deep font-medium";
                } else if (submitted) {
                  status = "Submitted";
                  statusClass = "text-pos font-medium";
                } else {
                  status = `—/${a.points_possible} pts`;
                  statusClass = "text-muted";
                }
                // Green bar = has a grade/submission; grey otherwise —
                // matches bCourses' left status rail.
                const barColor = grade != null || submitted ? "bg-pos" : "bg-hair";

                return (
                  <li key={a.id}>
                    <Link
                      href={`/assignments/${a.id}`}
                      className="flex items-stretch transition-colors hover:bg-[#eef7ff]"
                    >
                      <span className={`w-1 flex-shrink-0 ${barColor}`} aria-hidden />
                      <span className="flex flex-1 items-center justify-between gap-4 py-3 pl-3 pr-4">
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden className="text-base">📝</span>
                          <span>
                            <span className="block text-sm font-semibold text-sky">
                              {a.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {fmtDue(a.due_at)} &middot; {a.points_possible} pts
                            </span>
                          </span>
                        </span>
                        <span className={`whitespace-nowrap text-sm ${statusClass}`}>{status}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}

      {assignments.length === 0 && (
        <p className="mt-8 text-sm text-muted">No assignments yet.</p>
      )}
    </div>
  );
}
