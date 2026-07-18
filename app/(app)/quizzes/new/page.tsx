import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createQuiz } from "../actions";
import { QuizForm } from "./quiz-form";

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

      <QuizForm action={createQuiz} />
    </div>
  );
}
