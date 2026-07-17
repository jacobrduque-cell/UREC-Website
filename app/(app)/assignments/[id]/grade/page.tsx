import { createClient } from "@/lib/supabase/server";
import { getIsExec, getIsGrader, getSignedFileUrl, oneOrFirst } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addSubmissionComment, gradeSubmission } from "../../actions";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const rubric = oneOrFirst(rubricLink?.rubric as unknown) as
    | { id: string; rubric_criteria: CriterionRow[] }
    | undefined;
  const criteria = (rubric?.rubric_criteria ?? []).sort((a, b) => a.position - b.position);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Link
        href={`/assignments/${id}`}
        className="text-sm text-blue hover:underline"
      >
        &larr; Back to {assignment.title}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Grade: {assignment.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {rows.length} submission{rows.length === 1 ? "" : "s"} &middot;{" "}
        {assignment.points_possible} pts possible
      </p>

      <ul className="mt-8 flex flex-col gap-5">
        {rows.map((s) => (
          <SubmissionCard
            key={s.id}
            submission={s}
            assignmentId={id}
            pointsPossible={assignment.points_possible}
            criteria={criteria}
          />
        ))}
        {rows.length === 0 && (
          <li className="text-sm text-muted">No submissions yet.</li>
        )}
      </ul>
    </div>
  );
}

async function SubmissionCard({
  submission,
  assignmentId,
  pointsPossible,
  criteria,
}: {
  submission: SubmissionRow;
  assignmentId: string;
  pointsPossible: number;
  criteria: CriterionRow[];
}) {
  const grade = oneOrFirst(submission.grades);
  const resubmittedSinceGrading =
    grade != null && new Date(submission.submitted_at) > new Date(grade.graded_at);
  const rubricCriteriaArg = criteria.length > 0
    ? criteria.map((c) => ({ id: c.id, points: c.points }))
    : null;
  const gradeAction = gradeSubmission.bind(null, submission.id, assignmentId, rubricCriteriaArg);
  const commentAction = addSubmissionComment.bind(null, submission.id, assignmentId);
  const fileEntries = await Promise.all(
    submission.submission_files.map(async (sf) => ({
      ...sf.file,
      url: await getSignedFileUrl(sf.file.storage_path),
    })),
  );
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
            {new Date(submission.submitted_at).toLocaleString("en-US", {
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
                  {new Date(c.created_at).toLocaleString("en-US", {
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
