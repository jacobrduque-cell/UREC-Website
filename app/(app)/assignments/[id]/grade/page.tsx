import { createClient } from "@/lib/supabase/server";
import { getIsExec, getIsGrader, oneOrFirst } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addSubmissionComment, gradeSubmission } from "../../actions";
import { Breadcrumbs } from "../../../ui/breadcrumbs";
import { GradeKeyboardNav } from "./grade-keyboard-nav";

type Grade = {
  points_earned: number;
  graded_at: string;
  rubric_assessment: Record<string, { points: number; comment: string | null }> | null;
};
type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string } | null;
};
type SubmissionRow = {
  id: string;
  submitted_at: string;
  body_text: string | null;
  url: string | null;
  user: { full_name: string | null; email: string } | null;
  group: { name: string } | null;
  grades: Grade | Grade[] | null;
  submission_files: { file: { id: string; filename: string; storage_path: string } }[];
  submission_comments: Comment[];
};
type CriterionRow = { id: string; criterion: string; description: string; points: number; position: number };

export default async function GradeAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ filter?: string; s?: string }>;
}) {
  const { id } = await params;
  const { filter, s } = await searchParams;
  const ungradedOnly = filter === "ungraded";
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, points_possible, course_id")
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const [isExec, isGrader] = await Promise.all([
    getIsExec(),
    getIsGrader(assignment.course_id),
  ]);
  if (!isExec && !isGrader) redirect(`/assignments/${id}`);

  const [{ data: submissions }, { data: rubricLink }] = await Promise.all([
    supabase
      .from("submissions")
      .select(
        `id, submitted_at, body_text, url,
         user:users(full_name, email),
         group:groups(name),
         grades(points_earned, graded_at, rubric_assessment),
         submission_files(file:files(id, filename, storage_path)),
         submission_comments(id, body, created_at, author:users(full_name, email))`,
      )
      .eq("assignment_id", id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("assignment_rubrics")
      .select("rubric:rubrics(id, rubric_criteria(id, criterion, description, points, position))")
      .eq("assignment_id", id)
      .maybeSingle(),
  ]);

  const rows = (submissions ?? []) as unknown as SubmissionRow[];
  const ungradedCount = rows.filter((r) => oneOrFirst(r.grades) == null).length;
  const visibleRows = ungradedOnly
    ? rows.filter((r) => oneOrFirst(r.grades) == null)
    : rows;
  const rubric = oneOrFirst(rubricLink?.rubric as unknown) as
    | { id: string; rubric_criteria: CriterionRow[] }
    | undefined;
  const criteria = (rubric?.rubric_criteria ?? []).sort((a, b) => a.position - b.position);

  // SpeedGrader-style stepping. `?s=all` opens the classic full list;
  // otherwise `s` is an index into visibleRows (clamped), defaulting to the
  // first ungraded submission so exec land on work that needs attention.
  const len = visibleRows.length;
  const viewAll = s === "all";
  const firstUngradedIdx = visibleRows.findIndex((r) => oneOrFirst(r.grades) == null);
  const defaultIdx = firstUngradedIdx >= 0 ? firstUngradedIdx : 0;
  const parsedIdx = s != null && s !== "all" ? Number.parseInt(s, 10) : NaN;
  const current = Number.isNaN(parsedIdx)
    ? defaultIdx
    : Math.min(Math.max(parsedIdx, 0), Math.max(len - 1, 0));
  const currentRow = len > 0 ? visibleRows[current] : null;

  // Sign only the submission files we'll actually render — every row in the
  // full list, but just the current one when stepping — in ONE batch.
  // (Signing per file meant a 115-submission assignment fired 115+
  // sequential Storage round trips before the page could render.)
  const rowsToSign = viewAll ? visibleRows : currentRow ? [currentRow] : [];
  const allPaths = rowsToSign.flatMap((s) => s.submission_files.map((sf) => sf.file.storage_path));
  const signedUrlByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("submissions")
      .createSignedUrls(allPaths, 300);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedUrlByPath.set(entry.path, entry.signedUrl);
    }
  }

  const buildHref = (sVal: string | number) => {
    const p = new URLSearchParams();
    if (ungradedOnly) p.set("filter", "ungraded");
    p.set("s", String(sVal));
    return `/assignments/${id}/grade?${p.toString()}`;
  };

  const prevHref = current > 0 ? buildHref(current - 1) : null;
  const nextHref = current < len - 1 ? buildHref(current + 1) : null;
  const nextUngradedIdx = visibleRows.findIndex(
    (r, i) => i > current && oneOrFirst(r.grades) == null,
  );
  const currentName = currentRow
    ? currentRow.group
      ? `Team: ${currentRow.group.name}`
      : (currentRow.user?.full_name ?? currentRow.user?.email ?? "Unknown")
    : "";
  const currentGraded = currentRow ? oneOrFirst(currentRow.grades) != null : false;

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Breadcrumbs
        items={[
          { label: "Assignments", href: "/assignments" },
          { label: assignment.title, href: `/assignments/${id}` },
          { label: "Grade" },
        ]}
      />

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Grade: {assignment.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {rows.length} submission{rows.length === 1 ? "" : "s"} &middot;{" "}
        {ungradedCount} ungraded &middot; {assignment.points_possible} pts possible
      </p>

      <div className="mt-4 flex gap-2">
        <Link
          href={`/assignments/${id}/grade`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${!ungradedOnly ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
        >
          All ({rows.length})
        </Link>
        <Link
          href={`/assignments/${id}/grade?filter=ungraded`}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${ungradedOnly ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
        >
          Ungraded ({ungradedCount})
        </Link>
      </div>

      {len === 0 ? (
        <ul className="mt-6 flex flex-col gap-5">
          <li className="text-sm text-muted">
            {ungradedOnly && rows.length > 0
              ? "Everything's graded. 🎉"
              : "No submissions yet."}
          </li>
        </ul>
      ) : viewAll ? (
        <>
          <div className="mt-4">
            <Link
              href={buildHref(defaultIdx)}
              className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Step one at a time
            </Link>
          </div>
          <ul className="mt-6 flex flex-col gap-5">
            {visibleRows.map((s) => (
              <SubmissionCard
                key={s.id}
                submission={s}
                assignmentId={id}
                pointsPossible={assignment.points_possible}
                criteria={criteria}
                signedUrlByPath={signedUrlByPath}
              />
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          <GradeKeyboardNav prevHref={prevHref} nextHref={nextHref} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hair bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
                >
                  &larr; Prev
                </Link>
              ) : (
                <span className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text opacity-60">
                  &larr; Prev
                </span>
              )}
              {nextHref ? (
                <Link
                  href={nextHref}
                  className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
                >
                  Next &rarr;
                </Link>
              ) : (
                <span className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text opacity-60">
                  Next &rarr;
                </span>
              )}
            </div>
            <div className="min-w-0 text-center">
              <p className="text-sm font-medium text-navy-deep">
                Submission {current + 1} of {len}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {currentName} &middot; {currentGraded ? "Graded" : "Ungraded"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {nextUngradedIdx >= 0 && (
                <Link
                  href={buildHref(nextUngradedIdx)}
                  className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
                >
                  Next ungraded
                </Link>
              )}
              <Link
                href={buildHref("all")}
                className="rounded-md border border-hair px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                View all
              </Link>
            </div>
          </div>
          <ul className="flex flex-col gap-5">
            {currentRow && (
              <SubmissionCard
                key={currentRow.id}
                submission={currentRow}
                assignmentId={id}
                pointsPossible={assignment.points_possible}
                criteria={criteria}
                signedUrlByPath={signedUrlByPath}
              />
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({
  submission,
  assignmentId,
  pointsPossible,
  criteria,
  signedUrlByPath,
}: {
  submission: SubmissionRow;
  assignmentId: string;
  pointsPossible: number;
  criteria: CriterionRow[];
  signedUrlByPath: Map<string, string>;
}) {
  const grade = oneOrFirst(submission.grades);
  const resubmittedSinceGrading =
    grade != null && new Date(submission.submitted_at) > new Date(grade.graded_at);
  const rubricCriteriaArg = criteria.length > 0
    ? criteria.map((c) => ({ id: c.id, points: c.points }))
    : null;
  const gradeAction = gradeSubmission.bind(null, submission.id, assignmentId, rubricCriteriaArg);
  const commentAction = addSubmissionComment.bind(null, submission.id, assignmentId);
  const fileEntries = submission.submission_files.map((sf) => ({
    ...sf.file,
    url: signedUrlByPath.get(sf.file.storage_path) ?? null,
  }));
  const comments = [...submission.submission_comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  return (
    <li className="rounded-md border border-hair bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text">
            {submission.group
              ? `Team: ${submission.group.name}`
              : (submission.user?.full_name ?? submission.user?.email ?? "Unknown")}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Submitted{" "}
            {new Date(submission.submitted_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", 
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          {grade != null && (
            <span className="rounded-full border border-navy px-3 py-1 text-xs font-medium text-navy">
              Graded {grade.points_earned}/{pointsPossible}
            </span>
          )}
          {resubmittedSinceGrading && (
            <span className="rounded-full border border-gold bg-gold/10 px-3 py-1 text-xs font-medium text-gold">
              Resubmitted since grading
            </span>
          )}
        </div>
      </div>

      {submission.body_text && (
        <p className="mt-3 whitespace-pre-wrap rounded bg-paper-warm p-3 text-sm text-text">
          {submission.body_text}
        </p>
      )}
      {submission.url && (
        <a
          href={submission.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-sm text-blue hover:underline"
        >
          {submission.url}
        </a>
      )}
      {fileEntries.map((f) =>
        f.url ? (
          <a
            key={f.id}
            href={f.url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-sm text-blue hover:underline"
          >
            {f.filename}
          </a>
        ) : (
          <p key={f.id} className="mt-3 text-sm text-muted">
            {f.filename}
          </p>
        ),
      )}

      <form action={gradeAction} className="mt-4 flex flex-col gap-4">
        {criteria.length > 0 ? (
          <div className="flex flex-col divide-y divide-hair rounded-md border border-hair">
            {criteria.map((c) => {
              const existing = grade?.rubric_assessment?.[c.id];
              return (
                <div key={c.id} className="flex items-start justify-between gap-4 p-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">{c.criterion}</p>
                    <p className="mt-0.5 text-xs text-muted">{c.description}</p>
                    <input
                      type="text"
                      name={`rubric_comment_${c.id}`}
                      defaultValue={existing?.comment ?? ""}
                      placeholder="Comment (optional)"
                      className="mt-2 w-full rounded border border-hair bg-white px-2 py-1 text-xs text-text outline-none focus:border-blue"
                    />
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <input
                      type="number"
                      name={`rubric_score_${c.id}`}
                      min={0}
                      max={c.points}
                      step="0.5"
                      defaultValue={existing?.points ?? undefined}
                      required
                      className="w-16 rounded-md border border-hair bg-white px-2 py-1.5 text-right text-sm text-text outline-none focus:border-blue"
                    />
                    <span className="whitespace-nowrap text-xs text-muted">/ {c.points}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
              Score
            </label>
            <input
              type="number"
              name="points_earned"
              min={0}
              max={pointsPossible}
              step="0.5"
              defaultValue={grade?.points_earned ?? undefined}
              required
              className="w-28 rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
            />
          </div>
        )}
        <button
          type="submit"
          className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          {grade != null ? "Update Grade" : "Save Grade"}
        </button>
      </form>

      <div className="mt-5 border-t border-hair pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Comments
        </p>
        {comments.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2">
            {comments.map((c) => (
              <li key={c.id} className="rounded bg-paper-warm p-2.5 text-sm text-text">
                <p>{c.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {c.author?.full_name ?? c.author?.email ?? "Unknown"} &middot;{" "}
                  {new Date(c.created_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", 
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form action={commentAction} className="mt-3 flex gap-2">
          <input
            type="text"
            name="body"
            placeholder="Add a comment for the student…"
            className="flex-1 rounded-md border border-hair bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-blue"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md border border-hair px-4 py-1.5 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Comment
          </button>
        </form>
      </div>
    </li>
  );
}
