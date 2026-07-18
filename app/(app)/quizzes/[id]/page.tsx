import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { renderMarkdown } from "@/lib/markdown";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addQuestion, submitQuiz, toggleQuizPublished } from "../actions";
import { AddQuestionForm } from "../add-question-form";

type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "numeric"
  | "multiple_answer";
type Answer = {
  id: string;
  answer_text: string;
  is_correct: boolean;
  position: number;
  tolerance?: number | null;
};
type Question = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  position: number;
  quiz_answers: Answer[];
};

const TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: "multiple choice",
  multiple_answer: "multiple answer",
  true_false: "true / false",
  numeric: "numeric",
  short_answer: "short answer",
  essay: "essay",
};

// Question text is markdown (may include images). Rendered server-side.
function QuestionText({ text }: { text: string }) {
  return (
    <div
      className="rich-content text-sm text-text"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}

export default async function QuizDetailPage({
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

  const isExec = await getIsExec();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, title, description, published")
    .eq("id", id)
    .maybeSingle();
  if (!quiz) notFound();

  const { data: questionsData } = await supabase
    .from("quiz_questions")
    .select("id, question_text, question_type, points, position")
    .eq("quiz_id", id)
    .order("position", { ascending: true });
  const baseQuestions = (questionsData ?? []) as unknown as Omit<Question, "quiz_answers">[];
  const questionIds = baseQuestions.map((q) => q.id);

  // Answer options: exec reads the base table (with is_correct) to author;
  // students read quiz_answer_options, a view that omits is_correct so the
  // answer key never reaches the browser or the REST API (see migration
  // 20260717002700). Grading stays server-side under the admin client.
  const answersByQuestion = new Map<string, Answer[]>();
  if (questionIds.length > 0) {
    if (isExec) {
      const { data } = await supabase
        .from("quiz_answers")
        .select("id, question_id, answer_text, is_correct, position, tolerance")
        .in("question_id", questionIds);
      for (const a of (data ?? []) as (Answer & { question_id: string })[]) {
        const arr = answersByQuestion.get(a.question_id) ?? [];
        arr.push(a);
        answersByQuestion.set(a.question_id, arr);
      }
    } else {
      const { data } = await supabase
        .from("quiz_answer_options")
        .select("id, question_id, answer_text, position")
        .in("question_id", questionIds);
      for (const a of (data ?? []) as { id: string; question_id: string; answer_text: string; position: number }[]) {
        const arr = answersByQuestion.get(a.question_id) ?? [];
        arr.push({ ...a, is_correct: false });
        answersByQuestion.set(a.question_id, arr);
      }
    }
  }
  const questions: Question[] = baseQuestions.map((q) => ({
    ...q,
    quiz_answers: answersByQuestion.get(q.id) ?? [],
  }));
  const totalPts = questions.reduce((s, q) => s + Number(q.points), 0);

  const { data: mySubmission } = await supabase
    .from("quiz_submissions")
    .select("id, submitted_at, score")
    .eq("quiz_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <Link href="/quizzes" className="text-sm text-blue hover:underline">
        &larr; Back to Quizzes
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">{quiz.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {questions.length} question{questions.length === 1 ? "" : "s"} &middot; {totalPts} pts
          </p>
        </div>
        {isExec && (
          <div className="flex flex-shrink-0 items-center gap-2">
            <Link
              href={`/quizzes/${id}/submissions`}
              className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
            >
              Submissions
            </Link>
            <form action={toggleQuizPublished.bind(null, id, quiz.published)}>
              <button className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]">
                {quiz.published ? "Unpublish" : "Publish"}
              </button>
            </form>
          </div>
        )}
      </div>

      {quiz.description && (
        <p className="mt-4 text-sm text-text">{quiz.description}</p>
      )}

      {/* Exec authoring view */}
      {isExec ? (
        <div className="mt-8">
          <ul className="flex flex-col gap-4">
            {questions.map((q, i) => {
              const numericKey = q.question_type === "numeric" ? q.quiz_answers[0] : null;
              return (
                <li key={q.id} className="rounded-md border border-hair bg-white p-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-text">{i + 1}.</span>
                    <div className="min-w-0 flex-1">
                      <QuestionText text={q.question_text} />
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted">
                      {q.points} pts &middot; {TYPE_LABEL[q.question_type]}
                    </span>
                  </div>
                  {numericKey && (
                    <p className="mt-2 text-sm font-medium text-pos">
                      ✓ {numericKey.answer_text}
                      {Number(numericKey.tolerance) ? ` (±${numericKey.tolerance})` : ""}
                    </p>
                  )}
                  {q.question_type !== "numeric" && q.quiz_answers.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {[...q.quiz_answers].sort((a, b) => a.position - b.position).map((a) => (
                        <li key={a.id} className={`text-sm ${a.is_correct ? "font-medium text-pos" : "text-muted"}`}>
                          {a.is_correct ? "✓ " : "○ "}
                          {a.answer_text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
            {questions.length === 0 && <li className="text-sm text-muted">No questions yet.</li>}
          </ul>

          <AddQuestionForm action={addQuestion.bind(null, id)} />
        </div>
      ) : mySubmission?.submitted_at ? (
        /* Student — already submitted */
        <div className="mt-8 rounded-md border border-hair bg-white p-5">
          <p className="font-display text-xl text-navy-deep">
            {mySubmission.score ?? "—"}
            <span className="text-sm text-muted"> / {totalPts} pts</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Submitted {new Date(mySubmission.submitted_at).toLocaleString("en-US", { timeZone: "America/Los_Angeles",  month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
            {questions.some((q) => q.question_type === "short_answer" || q.question_type === "essay") &&
              " Written answers are reviewed by exec and may adjust your score."}
          </p>
        </div>
      ) : (
        /* Student — take the quiz */
        <form action={submitQuiz.bind(null, id)} className="mt-8 flex flex-col gap-6">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-md border border-hair bg-white p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-text">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <QuestionText text={q.question_text} />
                </div>
                <span className="whitespace-nowrap text-xs text-muted">{q.points} pts</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {q.question_type === "multiple_choice" || q.question_type === "true_false" ? (
                  [...q.quiz_answers].sort((a, b) => a.position - b.position).map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-text">
                      <input type="radio" name={`q_${q.id}`} value={a.id} className="h-4 w-4" />
                      {a.answer_text}
                    </label>
                  ))
                ) : q.question_type === "multiple_answer" ? (
                  [...q.quiz_answers].sort((a, b) => a.position - b.position).map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-text">
                      <input type="checkbox" name={`q_${q.id}`} value={a.id} className="h-4 w-4" />
                      {a.answer_text}
                    </label>
                  ))
                ) : q.question_type === "numeric" ? (
                  <input
                    name={`q_${q.id}`}
                    type="number"
                    step="any"
                    className="w-40 rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
                    placeholder="Your answer"
                  />
                ) : q.question_type === "short_answer" ? (
                  <input
                    name={`q_${q.id}`}
                    className="w-full rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
                    placeholder="Your answer"
                  />
                ) : (
                  <textarea
                    name={`q_${q.id}`}
                    rows={4}
                    className="w-full rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
                    placeholder="Your response"
                  />
                )}
              </div>
            </div>
          ))}
          {questions.length > 0 ? (
            <button
              type="submit"
              className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              Submit Quiz
            </button>
          ) : (
            <p className="text-sm text-muted">This quiz has no questions yet.</p>
          )}
        </form>
      )}
    </div>
  );
}

