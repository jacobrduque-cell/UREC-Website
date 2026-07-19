import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { createQuiz } from "../actions";
import { QuizForm } from "./quiz-form";
import { Breadcrumbs } from "../../ui/breadcrumbs";

export default async function NewQuizPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/quizzes");

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Breadcrumbs
        items={[
          { label: "Quizzes", href: "/quizzes" },
          { label: "New Quiz" },
        ]}
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        New Quiz
      </h1>

      <QuizForm action={createQuiz} />
    </div>
  );
}
