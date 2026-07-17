import { createClient } from "@/lib/supabase/server";
import { getIsExec, getSignedFileUrl } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { submitAssignment } from "../actions";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  points_possible: number;
  due_at: string | null;
  submission_type: "file" | "text" | "url" | "none";
  accepted_file_types: string[] | null;
};

type RubricCriterion = {
  id: string;
  criterion: string;
  description: string;
  points: number;
  position: number;
};

type Submission = {
  id: string;
  submitted_at: string;
  body_text: string | null;
  url: string | null;
  grades: { points_earned: number }[];
  submission_files: { file: { id: string; filename: string; storage_path: string } }[];
};

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const isExec = await getIsExec();

  const [{ data: assignment }, { data: rubricLinks }, { data: submissions }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(
          "id, title, description, points_possible, due_at, submission_type, accepted_file_types",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("assignment_rubrics")
        .select(
          "rubric:rubrics(rubric_criteria(id, criterion, description, points, position))",
        )
        .eq("assignment_id", id),
      supabase
        .from("submissions")
        .select(
          `id, submitted_at, body_text, url,
           grades(points_earned),
           submission_files(file:files(id, filename, storage_path))`,
        )
        .eq("assignment_id", id)
        .order("submitted_at", { ascending: false }),
    ]);

  if (!assignment) {
    notFound();
  }

  const a = assignment as unknown as Assignment;
  const criteria = (
    (rubricLinks?.[0] as unknown as {
      rubric: { rubric_criteria: RubricCriterion[] } | null;
    })?.rubric?.rubric_criteria ?? []
  ).sort((x, y) => x.position - y.position);
  const totalRubricPoints = criteria.reduce((s, c) => s + c.points, 0);

  const mySubmission = (submissions?.[0] as unknown as Submission) ?? null;
  const submitAction = submitAssignment.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Link href="/assignments" className="text-sm text-blue hover:underline">
        &larr; Back to Assignments
      </Link>

      <h1 className="mt-4 font-display text-2xl font-normal text-navy">
        {a.title}
      </h1>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <span>{fmtDue(a.due_at)}</span>
        <span>{a.points_possible} pts</span>
        <span>
          Submitting:{" "}
          {a.submission_type === "file"
            ? `a file upload${a.accepted_file_types ? ` (${a.accepted_file_types.join(", ").toUpperCase()})` : ""}`
            : a.submission_type === "text"
              ? "a text entry"
              : a.submission_type === "url"
                ? "a website URL"
                : "nothing"}
        </span>
      </div>

      {a.description && (
        <div
          className="rich-content mt-6 max-w-prose text-sm text-text"
          dangerouslySetInnerHTML={{ __html: a.description }}
        />
      )}

      {criteria.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Rubric
          </h2>
          <div className="mt-3 overflow-hidden rounded-md border border-hair">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-paper-warm text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-semibold">Criteria</th>
                  <th className="px-4 py-2.5 font-semibold">Description</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => (
                  <tr key={c.id} className="border-t border-hair">
                    <td className="px-4 py-2.5 font-medium text-text">
                      {c.criterion}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{c.description}</td>
                    <td className="px-4 py-2.5 text-right text-text">
                      {c.points}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-hair bg-paper-warm font-medium">
                  <td className="px-4 py-2.5 text-text" colSpan={2}>
                    Total Points
                  </td>
                  <td className="px-4 py-2.5 text-right text-text">
                    {totalRubricPoints}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isExec ? (
        <div className="mt-10 rounded-md border border-hair bg-paper-warm p-5">
          <p className="text-sm text-text">
            {submissions?.length ?? 0} submission
            {submissions?.length === 1 ? "" : "s"} so far.
          </p>
          <Link
            href={`/assignments/${id}/grade`}
            className="mt-3 inline-block rounded-full bg-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue"
          >
            Review &amp; Grade
          </Link>
        </div>
      ) : (
        <div className="mt-10 border-t border-hair pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Submission
          </h2>

          {mySubmission ? (
            <SubmissionSummary
              submission={mySubmission}
              pointsPossible={a.points_possible}
            />
          ) : (
            <form
              action={submitAction}
              encType="multipart/form-data"
              className="mt-4 flex flex-col gap-4"
            >
              {a.submission_type === "text" && (
                <textarea
                  name="body_text"
                  required
                  rows={8}
                  placeholder="Write your submission…"
                  className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
                />
              )}
              {a.submission_type === "url" && (
                <input
                  name="url"
                  type="url"
                  required
                  placeholder="https://…"
                  className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
                />
              )}
              {a.submission_type === "file" && (
                <input
                  name="file"
                  type="file"
                  required
                  accept={a.accepted_file_types
                    ?.map((t) => `.${t}`)
                    .join(",")}
                  className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white"
                />
              )}
              <button
                type="submit"
                className="self-start rounded-full bg-navy px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue"
              >
                Submit Assignment
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

async function SubmissionSummary({
  submission,
  pointsPossible,
}: {
  submission: Submission;
  pointsPossible: number;
}) {
  const grade = submission.grades?.[0]?.points_earned;
  const fileEntries = await Promise.all(
    submission.submission_files.map(async (sf) => ({
      ...sf.file,
      url: await getSignedFileUrl(sf.file.storage_path),
    })),
  );

  return (
    <div className="mt-4 rounded-md border border-hair bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xl text-navy">
            {grade != null ? grade : "—"}
            <span className="text-sm text-muted"> / {pointsPossible} pts</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {grade != null ? "Graded" : "Not yet graded"}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            grade != null
              ? "border-navy text-navy"
              : "border-pos text-pos"
          }`}
        >
          {grade != null ? "Graded" : "Submitted"}
        </span>
      </div>

      {submission.body_text && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-text">
          {submission.body_text}
        </p>
      )}
      {submission.url && (
        <a
          href={submission.url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block text-sm text-blue hover:underline"
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

      <p className="mt-4 text-xs text-muted">
        Submitted{" "}
        {new Date(submission.submitted_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
