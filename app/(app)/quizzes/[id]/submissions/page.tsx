import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import { gradeQuizResponses } from "../../actions";
import { SubmitButton } from "../../../ui/form-controls";
import { Breadcrumbs } from "../../../ui/breadcrumbs";

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  position: number;
};
type Response = {
  id: string;
  question_id: string;
  response_text: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
};
type Submission = {
  id: string;
  score: number | null;
  submitted_at: string | null;
  user: { full_name: string | null; email: string } | null;
  quiz_responses: Response[];
};

const WRITTEN = new Set(["short_answer", "essay"]);

export default async function QuizSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isExec = await getIsExec();
  if (!isExec) redirect(`/quizzes/${id}`);

  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!quiz) notFound();

  const [{ data: questionsData }, { data: submissionsData }] = await Promise.all([
    supabase
      .from("quiz_questions")
      .select("id, question_text, question_type, points, position")
      .eq("quiz_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("quiz_submissions")
      .select(
        "id, score, submitted_at, user:users(full_name, email), quiz_responses(id, question_id, response_text, is_correct, points_awarded)",
      )
      .eq("quiz_id", id)
      .order("submitted_at", { ascending: false }),
  ]);

  const questions = (questionsData ?? []) as unknown as Question[];
  const submissions = (submissionsData ?? []) as unknown as Submission[];
  const totalPts = questions.reduce((s, q) => s + Number(q.points), 0);
  const writtenQuestions = questions.filter((q) => WRITTEN.has(q.question_type));

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <Breadcrumbs
        items={[
          { label: "Quizzes", href: "/quizzes" },
          { label: quiz.title, href: `/quizzes/${id}` },
          { label: "Submissions" },
        ]}
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Submissions &middot; {quiz.title}
      </h1>
      <p className="mt-1 text-xs text-muted">
        {submissions.length} submitted &middot; {totalPts} pts possible
        {writtenQuestions.length > 0
          ? " · award points for written answers below"
          : " · this quiz auto-grades fully"}
      </p>

      <ul className="mt-8 flex flex-col gap-5">
        {submissions.map((s) => {
          const byQuestion = new Map(s.quiz_responses.map((r) => [r.question_id, r]));
          const gradeAction = gradeQuizResponses.bind(null, s.id, id);
          return (
            <li key={s.id} className="rounded-md border border-hair bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-text">
                  {s.user?.full_name ?? s.user?.email ?? "Unknown"}
                </p>
                <span className="rounded-full border border-navy px-3 py-1 text-xs font-medium text-navy">
                  {s.score ?? 0}/{totalPts}
                </span>
              </div>

              {writtenQuestions.length === 0 ? (
                <p className="mt-3 text-xs text-muted">Auto-graded — nothing to review.</p>
              ) : (
                <form action={gradeAction} className="mt-4 flex flex-col gap-4">
                  {writtenQuestions.map((q) => {
                    const r = byQuestion.get(q.id);
                    return (
                      <div key={q.id} className="border-t border-hair pt-3">
                        <p className="text-sm font-medium text-text">
                          {q.question_text}{" "}
                          <span className="text-xs text-muted">({q.points} pts)</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded bg-paper-warm p-2.5 text-sm text-text">
                          {r?.response_text || <span className="text-muted">No answer</span>}
                        </p>
                        {r && (
                          <div className="mt-2 flex items-center gap-2">
                            <label className="text-xs text-muted">Award</label>
                            <input
                              type="number"
                              name={`award_${r.id}`}
                              min={0}
                              max={q.points}
                              step="0.5"
                              defaultValue={r.points_awarded ?? undefined}
                              className="w-20 rounded-md border border-hair bg-white px-2 py-1 text-right text-sm text-text outline-none focus:border-blue"
                            />
                            <span className="text-xs text-muted">/ {q.points}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <SubmitButton
                    pendingText="Saving…"
                    className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
                  >
                    Save &amp; recompute score
                  </SubmitButton>
                </form>
              )}
            </li>
          );
        })}
        {submissions.length === 0 && (
          <li className="text-sm text-muted">No submissions yet.</li>
        )}
      </ul>
    </div>
  );
}
