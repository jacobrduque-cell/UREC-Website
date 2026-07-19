import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { submissionStatus, STATUS_LABEL, STATUS_PILL } from "@/lib/submission-status";
import { SortSelect } from "../ui/sort-select";
import Link from "next/link";

type Grade = { points_earned: number };
type AssignmentRow = {
  id: string;
  title: string;
  points_possible: number;
  due_at: string | null;
  published: boolean;
  created_at: string;
  assignment_group: { name: string; position: number } | null;
  submissions: { id: string; submitted_at: string | null; grades: Grade | Grade[] | null }[];
};

const SORTS = [
  { value: "due", label: "Due date" },
  { value: "title", label: "Title (A–Z)" },
  { value: "points", label: "Points (high→low)" },
  { value: "newest", label: "Newest" },
];

function sortAssignments(list: AssignmentRow[], sort: string): AssignmentRow[] {
  const arr = [...list];
  if (sort === "title") return arr.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "points") return arr.sort((a, b) => b.points_possible - a.points_possible);
  if (sort === "newest")
    return arr.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  // due (default): soonest first, undated last.
  return arr.sort((a, b) => {
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return `Due ${new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles",  month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort = SORTS.some((s) => s.value === sortParam) ? sortParam! : "due";
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
  // Managers only need a submission COUNT per assignment, so don't also
  // pull every submission's grade — at 115 members × dozens of
  // assignments that embed materialized thousands of rows on every page
  // load. Members get the fuller embed (RLS scopes it to just their own
  // and their group's rows, so it stays tiny) to render a status pill.
  // Managers get submitted_at + a grade marker per submission so the list
  // can show a "needs grading" badge. This adds columns, not rows (the
  // submissions embed already materialized one row per submission for the
  // count), so it stays a single query at the 115-member scale.
  const manageSelect = `id, title, points_possible, due_at, published, created_at,
           assignment_group:assignment_groups(name, position),
           submissions(id, submitted_at, grades(points_earned))`;
  const memberSelect = `id, title, points_possible, due_at, published, created_at,
           assignment_group:assignment_groups(name, position),
           submissions(id, submitted_at, grades(points_earned))`;
  const query = course
    ? supabase
        .from("assignments")
        .select(canManage ? manageSelect : memberSelect)
        .eq("course_id", course.id)
        .order("due_at", { ascending: true })
    : null;
  const { data } = query ? await query : { data: null };

  const assignments = sortAssignments(
    (data ?? []) as unknown as AssignmentRow[],
    sort,
  );

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

      {assignments.length > 0 && (
        <div className="mt-6 flex justify-end">
          <SortSelect options={SORTS} current={sort} basePath="/assignments" />
        </div>
      )}

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
                // Manager view: how many submitted attempts still have no grade.
                const needsGrading = canManage
                  ? a.submissions.filter(
                      (s) => s.submitted_at && oneOrFirst(s.grades)?.points_earned == null,
                    ).length
                  : 0;
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
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-sky">
                                {a.title}
                              </span>
                              {canManage && !a.published && (
                                <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                                  Draft
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {fmtDue(a.due_at)} &middot; {a.points_possible} pts
                            </span>
                          </span>
                        </span>
                        {canManage ? (
                          <span className="flex items-center gap-2 whitespace-nowrap text-sm">
                            {needsGrading > 0 && (
                              <span className="rounded-full bg-[#fff3e0] px-2 py-0.5 text-xs font-medium text-[#B4531A]">
                                {needsGrading} to grade
                              </span>
                            )}
                            <span className="text-muted">{a.submissions.length} submitted</span>
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
