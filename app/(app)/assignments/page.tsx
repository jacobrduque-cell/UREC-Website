import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { submissionStatus, STATUS_LABEL, STATUS_PILL } from "@/lib/submission-status";
import Link from "next/link";

type Grade = { points_earned: number };
type AssignmentRow = {
  id: string;
  title: string;
  points_possible: number;
  due_at: string | null;
  assignment_group: { name: string; position: number } | null;
  submissions: { id: string; submitted_at: string | null; grades: Grade | Grade[] | null }[];
};

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return `Due ${new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles",  month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export default async function AssignmentsPage() {
  const supabase = await createClient();

  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const isGrader = course ? await getIsGrader(course.id) : false;
  const canManage = isExec || isGrader;

  // For a plain member, RLS already scopes the embedded submissions to
  // their own rows AND their group's rows (submissions_select_own_or_exec),
  // so we do NOT filter by user_id here — doing so would drop group
  // submissions (user_id is null on those) and wrongly show them as
  // Missing. Graders/exec get every submission (used only for the
  // "N submitted" count), which is fine — they don't see the status pills.
  const query = course
    ? supabase
        .from("assignments")
        .select(
          `id, title, points_possible, due_at,
           assignment_group:assignment_groups(name, position),
           submissions(id, submitted_at, grades(points_earned))`,
        )
        .eq("course_id", course.id)
        .order("due_at", { ascending: true })
    : null;
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
                const sub = a.submissions[0];
                const grade = oneOrFirst(sub?.grades)?.points_earned;
                const submitted = a.submissions.length > 0;
                const status = submissionStatus({
                  dueAt: a.due_at,
                  submittedAt: sub?.submitted_at,
                  graded: grade != null,
                });

                // Manage view shows the roster count; student view shows a
                // status pill (Late / Missing / Submitted / Graded).
                const barColor =
                  status === "missing"
                    ? "bg-neg"
                    : status === "late"
                      ? "bg-[#B4531A]"
                      : grade != null || submitted
                        ? "bg-pos"
                        : "bg-hair";

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
                        {canManage ? (
                          <span className="whitespace-nowrap text-sm text-muted">
                            {a.submissions.length} submitted
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            {grade != null && (
                              <span className="text-sm font-medium text-navy-deep">
                                {grade}/{a.points_possible}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_PILL[status]}`}
                            >
                              {STATUS_LABEL[status]}
                            </span>
                          </span>
                        )}
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
