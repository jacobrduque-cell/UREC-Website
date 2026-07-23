"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { schedule, DEFAULT_STATE, type SrsGrade } from "@/lib/srs";
import { revalidatePath } from "next/cache";

type State = { error?: string };

// Exec: add a glossary term to the current course.
export async function addTerm(_prev: State, formData: FormData): Promise<State> {
  if (!(await getIsExec())) return { error: "Only exec can edit the glossary." };
  const course = await getCurrentCourse();
  if (!course) return { error: "No active course." };

  const term = String(formData.get("term") ?? "").trim();
  const definition = String(formData.get("definition") ?? "").trim();
  if (!term) return { error: "The term needs a name." };
  if (!definition) return { error: "Add a definition." };
  const formula = String(formData.get("formula") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("glossary_terms").insert({
    course_id: course.id,
    term,
    definition,
    formula: formula || null,
    category: category || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/glossary");
  return {};
}

// Exec: edit an existing term.
export async function updateTerm(termId: string, _prev: State, formData: FormData): Promise<State> {
  if (!(await getIsExec())) return { error: "Only exec can edit the glossary." };

  const term = String(formData.get("term") ?? "").trim();
  const definition = String(formData.get("definition") ?? "").trim();
  if (!term) return { error: "The term needs a name." };
  if (!definition) return { error: "Add a definition." };
  const formula = String(formData.get("formula") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("glossary_terms")
    .update({ term, definition, formula: formula || null, category: category || null })
    .eq("id", termId);
  if (error) return { error: error.message };

  revalidatePath("/glossary");
  return {};
}

// Exec: delete a term (cascades its flashcard progress).
export async function deleteTerm(termId: string) {
  if (!(await getIsExec())) return;
  const supabase = await createClient();
  await supabase.from("glossary_terms").delete().eq("id", termId);
  revalidatePath("/glossary");
}

// Member: record a flashcard review and schedule the next showing.
export async function reviewCard(termId: string, grade: SrsGrade) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("flashcard_progress")
    .select("interval_days, ease, reps")
    .eq("user_id", user.id)
    .eq("term_id", termId)
    .maybeSingle();

  const prev = existing
    ? {
        interval_days: Number(existing.interval_days),
        ease: Number(existing.ease),
        reps: existing.reps as number,
      }
    : DEFAULT_STATE;

  const next = schedule(prev, grade, Date.now());
  await supabase.from("flashcard_progress").upsert(
    {
      user_id: user.id,
      term_id: termId,
      interval_days: next.interval_days,
      ease: next.ease,
      reps: next.reps,
      due_at: next.due_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,term_id" },
  );

  revalidatePath("/glossary/study");
}
