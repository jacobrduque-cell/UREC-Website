import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { SortSelect } from "../ui/sort-select";
import Link from "next/link";

type QuizRow = {
  id: string;
  title: string;
  published: boolean;
  created_at: string;
  quiz_questions: { id: string; points: number }[];
};

const SORTS = [
  { value: "title", label: "Title (A–Z)" },
  { value: "newest", label: "Newest" },
  { value: "points", label: "Points (high→low)" },
  { value: "questions", label: "Most questions" },
];

function pts(q: QuizRow) {
  return q.quiz_questions.reduce((s, x) => s + Number(x.points), 0);
}

function sortQuizzes(list: QuizRow[], sort: string): QuizRow[] {
  const arr = [...list];
  if (sort === "newest")
    return arr.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  if (sort === "points") return arr.sort((a, b) => pts(b) - pts(a));
  if (sort === "questions")
    return arr.sort((a, b) => b.quiz_questions.length - a.quiz_questions.length);
  return arr.sort((a, b) => a.title.localeCompare(b.title));
}

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort = SORTS.some((s) => s.value === sortParam) ? sortParam! : "title";
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const { data } = course
    ? await supabase
        .from("quizzes")
        .select("id, title, published, created_at, quiz_questions(id, points)")
        .eq("course_id", course.id)
        .order("title")
    : { data: null };

  const quizzes = sortQuizzes((data ?? []) as unknown as QuizRow[], sort);

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

      {quizzes.length > 0 && (
        <div className="mt-6 flex justify-end">
          <SortSelect options={SORTS} current={sort} basePath="/quizzes" />
        </div>
      )}

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
