import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { SortSelect } from "../ui/sort-select";
import { BulkPublishBar } from "../ui/bulk-publish-bar";
import { bulkSetQuizzesPublished } from "./actions";
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

// Exec-only view filters. Students only ever see published quizzes (RLS),
// so the filter control is shown to exec only.
const FILTERS = [
  { value: "all", label: "All" },
  { value: "drafts", label: "Drafts" },
  { value: "published", label: "Published" },
];

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {
  const { sort: sortParam, filter: filterParam } = await searchParams;
  const sort = SORTS.some((s) => s.value === sortParam) ? sortParam! : "title";
  const filter = FILTERS.some((f) => f.value === filterParam) ? filterParam! : "all";
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const { data } = course
    ? await supabase
        .from("quizzes")
        .select("id, title, published, created_at, quiz_questions(id, points)")
        .eq("course_id", course.id)
        .order("title")
    : { data: null };

  const allQuizzes = (data ?? []) as unknown as QuizRow[];
  let quizzes = sortQuizzes(allQuizzes, sort);
  if (isExec && filter === "drafts") quizzes = quizzes.filter((q) => !q.published);
  if (isExec && filter === "published") quizzes = quizzes.filter((q) => q.published);
  const anyQuizzes = allQuizzes.length > 0;
  const publishAll = bulkSetQuizzesPublished.bind(null, true);
  const unpublishAll = bulkSetQuizzesPublished.bind(null, false);

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

      {anyQuizzes && (
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {isExec && (
            <SortSelect
              options={FILTERS}
              current={filter}
              basePath="/quizzes"
              paramName="filter"
              label="Show"
              preserve={{ sort: sort !== "title" ? sort : undefined }}
            />
          )}
          <SortSelect
            options={SORTS}
            current={sort}
            basePath="/quizzes"
            preserve={{ filter: filter !== "all" ? filter : undefined }}
          />
        </div>
      )}

      {quizzes.length > 0 ? (
        <form className="mt-8">
          {isExec && (
            <div className="mb-3 flex justify-end border-b border-hair pb-3">
              <BulkPublishBar
                publishAction={publishAll}
                unpublishAction={unpublishAll}
                noun="checked quizzes"
              />
            </div>
          )}
          <ul className="divide-y divide-hair border-t border-hair">
            {quizzes.map((q) => {
              const totalPts = q.quiz_questions.reduce((s, x) => s + Number(x.points), 0);
              return (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3.5">
                  <span className="flex min-w-0 items-center gap-2">
                    {isExec && (
                      <input
                        type="checkbox"
                        name="ids"
                        value={q.id}
                        aria-label={`Select ${q.title}`}
                        className="h-4 w-4 flex-shrink-0"
                      />
                    )}
                    <span aria-hidden>❓</span>
                    <Link href={`/quizzes/${q.id}`} className="truncate text-sm font-medium text-sky hover:underline">
                      {q.title}
                    </Link>
                    {isExec && !q.published && (
                      <span className="flex-shrink-0 rounded-full border border-hair px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Draft
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-xs text-muted">
                    {q.quiz_questions.length} question{q.quiz_questions.length === 1 ? "" : "s"} &middot;{" "}
                    {totalPts} pts
                  </span>
                </li>
              );
            })}
          </ul>
        </form>
      ) : anyQuizzes ? (
        <p className="mt-8 text-sm text-muted">No quizzes match this filter.</p>
      ) : (
        <div className="mt-8 rounded-md border border-hair bg-white py-16 text-center">
          <div aria-hidden className="text-4xl opacity-70">❓</div>
          <p className="mt-3 text-base font-medium text-text">No quizzes yet</p>
          <p className="mt-1 text-sm text-muted">
            {isExec
              ? "Build a quiz to check understanding before the next session."
              : "Nothing here yet — check back soon."}
          </p>
          {isExec && (
            <Link
              href="/quizzes/new"
              className="mt-5 inline-block rounded-md bg-blue px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
            >
              New Quiz
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
