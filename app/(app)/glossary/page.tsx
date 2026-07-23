import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GlossaryClient } from "./glossary-client";
import { addTerm, updateTerm, deleteTerm } from "./actions";

export type Term = {
  id: string;
  term: string;
  definition: string;
  formula: string | null;
  category: string | null;
};

export default async function GlossaryPage() {
  const course = await getCurrentCourse();
  if (!course) redirect("/dashboard");
  const isExec = await getIsExec();

  const supabase = await createClient();
  const { data } = await supabase
    .from("glossary_terms")
    .select("id, term, definition, formula, category, position")
    .eq("course_id", course.id)
    .order("category", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  const terms = (data ?? []) as Term[];

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">Glossary</h1>
          <p className="mt-1 text-sm text-muted">
            {course.name} — the CRE vocabulary we teach, with formulas. {terms.length} terms.
          </p>
        </div>
        <Link
          href="/glossary/study"
          className="whitespace-nowrap rounded-md bg-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky"
        >
          Study flashcards →
        </Link>
      </div>

      <GlossaryClient
        terms={terms}
        isExec={isExec}
        addAction={addTerm}
        updateAction={updateTerm}
        deleteAction={deleteTerm}
      />
    </div>
  );
}
