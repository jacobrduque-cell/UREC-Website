"use server";

import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

type Row = { id?: string; name: string; weight: number; kind: "standard" | "attendance" };
type State = { error?: string; ok?: boolean };

// Save the whole set of grade categories for a course in one shot: update
// kept rows, insert new ones, delete removed ones. Deleting a category is
// safe — assignments/quizzes reference it ON DELETE SET NULL, so their
// items just become uncategorized rather than disappearing.
export async function saveWeights(courseId: string, _prev: State, formData: FormData): Promise<State> {
  if (!(await getIsExec())) return { error: "Only exec can edit grade weights." };

  let rows: Row[];
  try {
    rows = JSON.parse(String(formData.get("rows") ?? "[]")) as Row[];
  } catch {
    return { error: "Could not read the categories — please try again." };
  }

  const clean: Row[] = [];
  for (const r of rows) {
    const name = (r.name ?? "").trim();
    if (!name) return { error: "Every category needs a name." };
    const weight = Number(r.weight);
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) {
      return { error: `"${name}" needs a weight between 0 and 100.` };
    }
    clean.push({ id: r.id, name, weight, kind: r.kind === "attendance" ? "attendance" : "standard" });
  }
  if (clean.filter((r) => r.kind === "attendance").length > 1) {
    return { error: "Only one Attendance category is allowed." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("assignment_groups")
    .select("id")
    .eq("course_id", courseId);
  const existingIds = new Set(((existing ?? []) as { id: string }[]).map((g) => g.id));
  const keptIds = new Set(clean.filter((r) => r.id && existingIds.has(r.id)).map((r) => r.id as string));

  const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from("assignment_groups").delete().in("id", toDelete);
    if (error) return { error: "Could not remove a category. Nothing was changed." };
  }

  for (let i = 0; i < clean.length; i++) {
    const r = clean[i];
    if (r.id && existingIds.has(r.id)) {
      const { error } = await supabase
        .from("assignment_groups")
        .update({ name: r.name, weight_pct: r.weight, position: i, kind: r.kind })
        .eq("id", r.id);
      if (error) return { error: `Could not save "${r.name}".` };
    } else {
      const { error } = await supabase
        .from("assignment_groups")
        .insert({ course_id: courseId, name: r.name, weight_pct: r.weight, position: i, kind: r.kind });
      if (error) return { error: `Could not add "${r.name}" (an attendance category may already exist).` };
    }
  }

  revalidatePath("/grades/weights");
  revalidatePath("/grades");
  revalidatePath("/grades/gradebook");
  return { ok: true };
}
