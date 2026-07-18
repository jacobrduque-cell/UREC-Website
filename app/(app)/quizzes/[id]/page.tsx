import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { addQuestion, submitQuiz, toggleQuizPublished } from "../actions";

type Answer = { id: string; answer_text: string; is_correct: boolean; position: number };
type Question = {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "short_answer" | "essay";
  points: number;
  position: number;
  quiz_answers: Answer[];
};

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
        .select("id, question_id, answer_text, is_correct, position")
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
          <form action={toggleQuizPublished.bind(null, id, quiz.published)}>
            <button className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]">
              {quiz.published ? "Unpublish" : "Publish"}
            </button>
          </form>
        )}
      </div>

      {quiz.description && (
        <p className="mt-4 text-sm text-text">{quiz.description}</p>
      )}

      {/* Exec authoring view */}
      {isExec ? (
        <div className="mt-8">
          <ul className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <li key={q.id} className="rounded-md border border-hair bg-white p-4">
                <p className="text-sm font-medium text-text">
                  {i + 1}. {q.question_text}{" "}
                  <span className="text-xs text-muted">({q.points} pts &middot; {q.question_type.replace("_", " ")})</span>
                </p>
                {q.quiz_answers.length > 0 && (
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
            ))}
            {questions.length === 0 && <li className="text-sm text-muted">No questions yet.</li>}
          </ul>

          <AddQuestionForm quizId={id} />
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
              <p className="text-sm font-medium text-text">
                {i + 1}. {q.question_text}{" "}
                <span className="text-xs text-muted">({q.points} pts)</span>
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {(q.question_type === "multiple_choice" || q.question_type === "true_false") ? (
                  [...q.quiz_answers].sort((a, b) => a.position - b.position).map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-text">
                      <input type="radio" name={`q_${q.id}`} value={a.id} className="h-4 w-4" />
                      {a.answer_text}
                    </label>
                  ))
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

function AddQuestionForm({ quizId }: { quizId: string }) {
  const optionRows = Array.from({ length: 4 });
  return (
    <div className="mt-8 border-t border-hair pt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Add Question</h2>
      <form action={addQuestion.bind(null, quizId)} className="mt-3 flex flex-col gap-4">
        <textarea
          name="question_text"
          required
          rows={2}
          placeholder="Question text"
          className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Type</label>
            <select name="question_type" defaultValue="multiple_choice" className="w-full rounded-md border border-hair bg-white px-3 py-2 text-sm outline-none focus:border-blue">
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True / False</option>
              <option value="short_answer">Short answer</option>
              <option value="essay">Essay</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">Points</label>
            <input name="points" type="number" min={0} step="0.5" defaultValue={1} className="w-full rounded-md border border-hair bg-white px-3 py-2 text-sm outline-none focus:border-blue" />
          </div>
        </div>

        <div className="rounded-md border border-hair bg-[#fafbfb] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            Multiple choice — fill options, pick correct (leave blank for other types)
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {optionRows.map((_, i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="radio" name="mc_correct" value={i} defaultChecked={i === 0} className="h-4 w-4" />
                <input name={`option_${i}`} placeholder={`Option ${i + 1}`} className="flex-1 rounded-md border border-hair bg-white px-2 py-1.5 text-sm outline-none focus:border-blue" />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
            True / False — correct answer
          </p>
          <div className="mt-1 flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" name="tf_correct" value="true" defaultChecked className="h-4 w-4" /> True</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="tf_correct" value="false" className="h-4 w-4" /> False</label>
          </div>
        </div>

        <button
          type="submit"
          className="self-start rounded-md bg-blue px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Add Question
        </button>
      </form>
    </div>
  );
}
