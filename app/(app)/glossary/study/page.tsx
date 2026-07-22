import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StudyClient } from "./study-client";

type Card = {
  id: string;
  term: string;
  definition: string;
  formula: string | null;
  category: string | null;
};

const SESSION_CAP = 20;

export default async function StudyPage() {
  const course = await getCurrentCourse();
  if (!course) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nowIso = new Date().toISOString();
  const [{ data: termData }, { data: progData }] = await Promise.all([
    supabase
      .from("glossary_terms")
      .select("id, term, definition, formula, category")
      .eq("course_id", course.id)
      .order("position", { ascending: true }),
    user
      ? supabase.from("flashcard_progress").select("term_id, due_at").eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const terms = (termData ?? []) as Card[];
  const dueByTerm = new Map<string, string>();
  for (const p of (progData ?? []) as { term_id: string; due_at: string }[]) {
    dueByTerm.set(p.term_id, p.due_at);
  }

  // A card is up for review if it's new (never seen) or its due time has passed.
  // New cards go last so already-learned cards get reinforced first.
  const seen = terms.filter((t) => dueByTerm.has(t.id) && dueByTerm.get(t.id)! <= nowIso);
  const fresh = terms.filter((t) => !dueByTerm.has(t.id));
  const queue = [...seen, ...fresh].slice(0, SESSION_CAP);

  return (
    <div className="mx-auto w-full max-w-xl px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-navy-deep">Flashcards</h1>
        <Link href="/glossary" className="text-sm text-blue hover:underline">
          ← Glossary
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        {terms.length} terms &middot; {queue.length} up for review now
      </p>
      <StudyClient cards={queue} totalTerms={terms.length} />
    </div>
  );
}
