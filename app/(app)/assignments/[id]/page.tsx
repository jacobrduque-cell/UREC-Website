import { createClient } from "@/lib/supabase/server";
import { getIsExec, getIsGrader, getMyGroupIds, getSignedFileUrl, oneOrFirst } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addSubmissionComment, submitAssignment } from "../actions";

type Grade = { points_earned: number };
type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: { full_name: string | null; email: string } | null;
};

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  points_possible: number;
  due_at: string | null;
  unlock_at: string | null;
  lock_at: string | null;
  submission_type: "file" | "text" | "url" | "none";
  accepted_file_types: string[] | null;
  course_id: string;
  allow_group_submission: boolean;
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
  grades: Grade | Grade[] | null;
  submission_files: { file: { id: string; filename: string; storage_path: string } }[];
  submission_comments: Comment[];
};

// Plain helper (not a component) so reading the current time doesn't trip
// React's purity check on the component body.
function windowState(unlockAt: string | null, lockAt: string | null) {
  const now = Date.now();
  return {
    notYetOpen: unlockAt != null && now < new Date(unlockAt).getTime(),
    closed: lockAt != null && now > new Date(lockAt).getTime(),
  };
}

function fmtDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles",
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, title, description, points_possible, due_at, unlock_at, lock_at, submission_type, accepted_file_types, course_id, allow_group_submission",
    )
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const a = assignment as unknown as Assignment;
  const [isExec, isGrader] = await Promise.all([
    getIsExec(),
    getIsGrader(a.course_id),
  ]);
  const canManage = isExec || isGrader;

  let myGroupId: string | null = null;
  if (!canManage && a.allow_group_submission) {
    // A member can be in more than one group in a course, so this must
    // not use .maybeSingle() (which errors on 2+ rows, wrongly reporting
    // "you're not in a group" and blocking submission). Pick the first
    // group deterministically — the submit action resolves it the same
    // way, so the viewed submission and the write target always match.
    const groupIds = await getMyGroupIds(a.course_id);
    myGroupId = groupIds[0] ?? null;
  }

  const submissionColumns = `id, submitted_at, body_text, url,
             grades(points_earned),
             submission_files(file:files(id, filename, storage_path)),
             submission_comments(id, body, created_at, author:users(full_name, email))`;

  const [{ data: rubricLinks }, submissionData] = await Promise.all([
    supabase
      .from("assignment_rubrics")
      .select(
        "rubric:rubrics(rubric_criteria(id, criterion, description, points, position))",
      )
      .eq("assignment_id", id),
    canManage
      ? supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("assignment_id", id)
      : a.allow_group_submission
        ? myGroupId
          ? supabase
              .from("submissions")
              .select(submissionColumns)
              .eq("assignment_id", id)
              .eq("group_id", myGroupId)
              .maybeSingle()
          : Promise.resolve({ data: null, count: null })
        : supabase
            .from("submissions")
            .select(submissionColumns)
            .eq("assignment_id", id)
            .eq("user_id", user.id)
            .maybeSingle(),
  ]);

  const criteria = (
    (rubricLinks?.[0] as unknown as {
      rubric: { rubric_criteria: RubricCriterion[] } | null;
    })?.rubric?.rubric_criteria ?? []
  ).sort((x, y) => x.position - y.position);
  const totalRubricPoints = criteria.reduce((s, c) => s + c.points, 0);

  const submissionCount = canManage ? (submissionData.count ?? 0) : 0;
  const mySubmission = canManage ? null : (submissionData.data as unknown as Submission | null);
  const needsGroupToSubmit = !canManage && a.allow_group_submission && !myGroupId;
  const submitAction = submitAssignment.bind(null, id);

  // Availability window (see submitAssignment, which enforces it
  // server-side). Computed in a plain helper so the current-time read
  // doesn't trip React's component-purity lint.
  const { notYetOpen, closed } = windowState(a.unlock_at, a.lock_at);

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Link href="/assignments" className="text-sm text-blue hover:underline">
        &larr; Back to Assignments
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        {a.title}
      </h1>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
        <span>{fmtDue(a.due_at)}</span>
        {a.lock_at && (
          <span className={closed ? "text-neg" : ""}>
            {closed ? "Closed" : "Closes"} {fmtDue(a.lock_at)}
          </span>
        )}
        {notYetOpen && a.unlock_at && (
          <span className="text-[#B4531A]">Opens {fmtDue(a.unlock_at)}</span>
        )}
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

      {canManage ? (
        <div className="mt-10 rounded-md border border-hair bg-paper-warm p-5">
          <p className="text-sm text-text">
            {submissionCount} submission
            {submissionCount === 1 ? "" : "s"} so far.
          </p>
          <div className="mt-3 flex gap-3">
            <Link
              href={`/assignments/${id}/grade`}
              className="inline-block rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              Review &amp; Grade
            </Link>
            {isExec && (
              <Link
                href={`/assignments/${id}/edit`}
                className="inline-block rounded-md border border-hair px-5 py-2 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
              >
                Edit
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-10 border-t border-hair pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Submission
          </h2>
          {a.allow_group_submission && (
            <p className="mt-2 text-xs text-muted">
              This assignment submits once per team.
            </p>
          )}

          {notYetOpen ? (
            <p className="mt-4 text-sm text-muted">
              This assignment isn&rsquo;t open for submissions yet — it opens{" "}
              {fmtDue(a.unlock_at)}.
            </p>
          ) : needsGroupToSubmit ? (
            <p className="mt-4 text-sm text-muted">
              You&rsquo;re not in a group yet, so there&rsquo;s nowhere for
              your team&rsquo;s submission to go. Ask exec to add you to one
              on the People page.
            </p>
          ) : mySubmission ? (
            <>
              <SubmissionSummary
                submission={mySubmission}
                pointsPossible={a.points_possible}
                assignmentId={id}
              />
              {closed ? (
                <p className="mt-4 text-sm text-muted">
                  Submissions closed {fmtDue(a.lock_at)} — this is your final
                  submission.
                </p>
              ) : (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-blue hover:underline">
                    Resubmit
                  </summary>
                  <form
                    action={submitAction}
                    encType="multipart/form-data"
                    className="mt-4 flex flex-col gap-4"
                  >
                    <SubmissionFields assignment={a} />
                    <button
                      type="submit"
                      className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
                    >
                      Resubmit
                    </button>
                  </form>
                </details>
              )}
            </>
          ) : closed ? (
            <p className="mt-4 text-sm text-neg">
              Submissions for this assignment closed {fmtDue(a.lock_at)}. You
              didn&rsquo;t submit.
            </p>
          ) : (
            <form
              action={submitAction}
              encType="multipart/form-data"
              className="mt-4 flex flex-col gap-4"
            >
              <SubmissionFields assignment={a} />
              <button
                type="submit"
                className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
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

function SubmissionFields({ assignment: a }: { assignment: Assignment }) {
  return (
    <>
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
          accept={a.accepted_file_types?.map((t) => `.${t}`).join(",")}
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none file:mr-3 file:rounded-md file:border-0 file:bg-blue file:px-4 file:py-1.5 file:text-xs file:font-medium file:text-white"
        />
      )}
    </>
  );
}

async function SubmissionSummary({
  submission,
  pointsPossible,
  assignmentId,
}: {
  submission: Submission;
  pointsPossible: number;
  assignmentId: string;
}) {
  const grade = oneOrFirst(submission.grades)?.points_earned;
  const fileEntries = await Promise.all(
    submission.submission_files.map(async (sf) => ({
      ...sf.file,
      url: await getSignedFileUrl(sf.file.storage_path),
    })),
  );
  const comments = [...submission.submission_comments].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const commentAction = addSubmissionComment.bind(null, submission.id, assignmentId);

  return (
    <div className="mt-4 rounded-md border border-hair bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-xl font-bold text-navy-deep">
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
        {new Date(submission.submitted_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles", 
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>

      {comments.length > 0 && (
        <div className="mt-4 border-t border-hair pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Comments
          </p>
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
        </div>
      )}
      <form action={commentAction} className="mt-3 flex gap-2">
        <input
          type="text"
          name="body"
          placeholder="Ask a question about this submission…"
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
  );
}
