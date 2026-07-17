import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createQuiz } from "../actions";

export default async function NewQuizPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/quizzes");

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Link href="/quizzes" className="text-sm text-blue hover:underline">
        &larr; Back to Quizzes
      </Link>
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        New Quiz
      </h1>

      <form action={createQuiz} className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <div>
          <label htmlFor="description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
          />
        </div>
        <button
          type="submit"
          className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Create Quiz &amp; Add Questions
        </button>
      </form>
    </div>
  );
}
