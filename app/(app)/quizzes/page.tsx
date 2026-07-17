import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import Link from "next/link";

type QuizRow = {
  id: string;
  title: string;
  published: boolean;
  quiz_questions: { id: string; points: number }[];
};

export default async function QuizzesPage() {
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const { data } = course
    ? await supabase
        .from("quizzes")
        .select("id, title, published, quiz_questions(id, points)")
        .eq("course_id", course.id)
        .order("title")
    : { data: null };

  const quizzes = (data ?? []) as unknown as QuizRow[];

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl font-bold text-navy-deep">Quizzes</h1>
        {isExec && (
          <Link
            href="/quizzes/new"
            className="whitespace-nowrap rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            New Quiz
          </Link>
        )}
      </div>

      <ul className="mt-8 divide-y divide-hair border-t border-hair">
        {quizzes.map((q) => {
          const totalPts = q.quiz_questions.reduce((s, x) => s + Number(x.points), 0);
          return (
            <li key={q.id} className="flex items-center justify-between gap-3 py-3.5">
              <span className="flex items-center gap-2">
                <span aria-hidden>❓</span>
                <Link href={`/quizzes/${q.id}`} className="text-sm font-medium text-sky hover:underline">
                  {q.title}
                </Link>
                {isExec && !q.published && (
                  <span className="rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Draft
                  </span>
                )}
              </span>
              <span className="text-xs text-muted">
                {q.quiz_questions.length} question{q.quiz_questions.length === 1 ? "" : "s"} &middot;{" "}
                {totalPts} pts
              </span>
            </li>
          );
        })}
        {quizzes.length === 0 && (
          <li className="py-6 text-sm text-muted">No quizzes yet.</li>
        )}
      </ul>
    </div>
  );
}
