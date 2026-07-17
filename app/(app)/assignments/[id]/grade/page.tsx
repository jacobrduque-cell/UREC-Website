import { createClient } from "@/lib/supabase/server";
import { getIsExec, getSignedFileUrl, oneOrFirst } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { gradeSubmission } from "../../actions";

type Grade = { points_earned: number };
type SubmissionRow = {
  id: string;
  submitted_at: string;
  body_text: string | null;
  url: string | null;
  user: { full_name: string | null; email: string } | null;
  grades: Grade | Grade[] | null;
  submission_files: { file: { id: string; filename: string; storage_path: string } }[];
};

export default async function GradeAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isExec = await getIsExec();
  if (!isExec) {
    redirect(`/assignments/${id}`);
  }

  const supabase = await createClient();
  const [{ data: assignment }, { data: submissions }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, points_possible")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("submissions")
      .select(
        `id, submitted_at, body_text, url,
         user:users(full_name, email),
         grades(points_earned),
         submission_files(file:files(id, filename, storage_path))`,
      )
      .eq("assignment_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (!assignment) {
    notFound();
  }

  const rows = (submissions ?? []) as unknown as SubmissionRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Link
        href={`/assignments/${id}`}
        className="text-sm text-blue hover:underline"
      >
        &larr; Back to {assignment.title}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-normal text-navy">
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
}: {
  submission: SubmissionRow;
  assignmentId: string;
  pointsPossible: number;
}) {
  const grade = oneOrFirst(submission.grades)?.points_earned;
  const gradeAction = gradeSubmission.bind(null, submission.id, assignmentId);
  const fileEntries = await Promise.all(
    submission.submission_files.map(async (sf) => ({
      ...sf.file,
      url: await getSignedFileUrl(sf.file.storage_path),
    })),
  );

  return (
    <li className="rounded-md border border-hair bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text">
            {submission.user?.full_name ?? submission.user?.email ?? "Unknown"}
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
        {grade != null && (
          <span className="rounded-full border border-navy px-3 py-1 text-xs font-medium text-navy">
            Graded {grade}/{pointsPossible}
          </span>
        )}
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

      <form action={gradeAction} className="mt-4 flex items-end gap-3">
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
            defaultValue={grade ?? undefined}
            required
            className="w-28 rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue"
        >
          {grade != null ? "Update Grade" : "Save Grade"}
        </button>
      </form>
    </li>
  );
}
