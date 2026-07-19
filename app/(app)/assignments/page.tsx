import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { submissionStatus, STATUS_LABEL, STATUS_PILL } from "@/lib/submission-status";
import { relativeTime } from "@/lib/relative-time";
import { SortSelect } from "../ui/sort-select";
import { BulkPublishBar } from "../ui/bulk-publish-bar";
import { bulkSetAssignmentsPublished } from "./actions";
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

// Submitted attempts on this assignment that still have no grade.
function needsGradingCount(a: AssignmentRow): number {
  return a.submissions.filter(
    (s) => s.submitted_at && oneOrFirst(s.grades)?.points_earned == null,
  ).length;
}

// Manager-only view filters (students never see drafts — RLS — so the
// control is shown to exec/graders only).
const FILTERS = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "grading", label: "Needs grading" },
];

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {
  const { sort: sortParam, filter: filterParam } = await searchParams;
  const sort = SORTS.some((s) => s.value === sortParam) ? sortParam! : "due";
  const filter = FILTERS.some((f) => f.value === filterParam) ? filterParam! : "all";
  const supabase = await createClient();

  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const isGrader = course ? await getIsGrader(course.id) : false;
  const canManage = isExec || isGrader;

  // For a plain member, RLS already scopes the embedded submissions to
  // their own rows AND their group's rows (submissions_select_own_or_exec),
  // so we do NOT filter by user_id here — doing so would drop group
  // submissions (user_id is null on those) and wrongly show them as
  // Missing. Managers get submitted_at + a grade marker per submission so
  // the list can show a "needs grading" badge; this adds columns, not
  // rows, so it stays a single query at the 115-member scale.
  const select = `id, title, points_possible, due_at, published, created_at,
           assignment_group:assignment_groups(name, position),
           submissions(id, submitted_at, grades(points_earned))`;
  const query = course
    ? supabase
        .from("assignments")
        .select(select)
        .eq("course_id", course.id)
        .order("due_at", { ascending: true })
    : null;
  const { data } = query ? await query : { data: null };

  const allAssignments = (data ?? []) as unknown as AssignmentRow[];
  const anyAssignments = allAssignments.length > 0;
  let assignments = sortAssignments(allAssignments, sort);
  if (canManage && filter === "drafts") assignments = assignments.filter((a) => !a.published);
  if (canManage && filter === "grading")
    assignments = assignments.filter((a) => needsGradingCount(a) > 0);

  const publishAll = bulkSetAssignmentsPublished.bind(null, true);
  const unpublishAll = bulkSetAssignmentsPublished.bind(null, false);

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

      {anyAssignments && (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {canManage && (
            <SortSelect
              options={FILTERS}
              current={filter}
              basePath="/assignments"
              paramName="filter"
              label="Show"
              preserve={{ sort: sort !== "due" ? sort : undefined }}
            />
          )}
          <SortSelect
            options={SORTS}
            current={sort}
            basePath="/assignments"
            preserve={{ filter: filter !== "all" ? filter : undefined }}
          />
        </div>
      )}

      {assignments.length === 0 && anyAssignments && (
        <p className="mt-8 text-sm text-muted">No assignments match this filter.</p>
      )}

      {assignments.length > 0 && canManage && (
        <form>
          <div className="mt-6 flex justify-end border-b border-hair pb-3">
            <BulkPublishBar
              publishAction={publishAll}
              unpublishAction={unpublishAll}
              noun="checked assignments"
            />
          </div>
          {orderedGroups.map(([groupName, items]) => (
            <AssignmentGroup
              key={groupName}
              groupName={groupName}
              items={items}
              canManage={canManage}
              selectable
            />
          ))}
        </form>
      )}

      {assignments.length > 0 &&
        !canManage &&
        orderedGroups.map(([groupName, items]) => (
          <AssignmentGroup
            key={groupName}
            groupName={groupName}
            items={items}
            canManage={canManage}
            selectable={false}
          />
        ))}

      {!anyAssignments && (
        <div className="mt-8 rounded-md border border-hair bg-white py-16 text-center">
          <div aria-hidden className="text-4xl opacity-70">📝</div>
          <p className="mt-3 text-base font-medium text-text">No assignments yet</p>
          <p className="mt-1 text-sm text-muted">
            {isExec
              ? "Create the first assignment to get your analysts started."
              : "Nothing here yet — check back soon."}
          </p>
          {isExec && (
            <Link
              href="/assignments/new"
              className="mt-5 inline-block rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              New Assignment
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// One bCourses-style assignment-group block: a bordered card with a grey
// group header, then rows carrying a status bar, a type icon, the title,
// and a due/points line. `selectable` adds the bulk-select checkbox (only
// rendered inside the manager's <form>).
function AssignmentGroup({
  groupName,
  items,
  canManage,
  selectable,
}: {
  groupName: string;
  items: AssignmentRow[];
  canManage: boolean;
  selectable: boolean;
}) {
  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-md border border-hair">
        <div className="bg-[#f2f4f4] px-4 py-2.5">
          <h2 className="text-sm font-bold text-navy-deep">{groupName}</h2>
        </div>
        <ul className="divide-y divide-hair">
          {items.map((a) => {
            const sub = a.submissions[0];
            const grade = oneOrFirst(sub?.grades)?.points_earned;
            const submitted = a.submissions.length > 0;
            const needsGrading = canManage ? needsGradingCount(a) : 0;
            const status = submissionStatus({
              dueAt: a.due_at,
              submittedAt: sub?.submitted_at,
              graded: grade != null,
            });
            const barColor =
              status === "missing"
                ? "bg-neg"
                : status === "late"
                  ? "bg-[#B4531A]"
                  : grade != null || submitted
                    ? "bg-pos"
                    : "bg-hair";

            return (
              <li key={a.id} className="flex items-stretch">
                {selectable && (
                  <label className="flex items-center pl-3" aria-label={`Select ${a.title}`}>
                    <input
                      type="checkbox"
                      name="ids"
                      value={a.id}
                      className="h-4 w-4"
                    />
                  </label>
                )}
                <Link
                  href={`/assignments/${a.id}`}
                  className="flex flex-1 items-stretch transition-colors hover:bg-[#eef7ff]"
                >
                  <span className={`w-1 flex-shrink-0 ${barColor}`} aria-hidden />
                  <span className="flex flex-1 items-center justify-between gap-4 py-3 pl-3 pr-4">
                    <span className="flex items-center gap-2.5">
                      <span aria-hidden className="text-base">📝</span>
                      <span>
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-sky">{a.title}</span>
                          {canManage && !a.published && (
                            <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                              Draft
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {fmtDue(a.due_at)}
                          {a.due_at && (
                            <span className="text-muted/80"> &middot; {relativeTime(a.due_at)}</span>
                          )}{" "}
                          &middot; {a.points_possible} pts
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
  );
}
