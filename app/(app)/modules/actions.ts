"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

// RLS re-enforces exec-only on modules/module_items writes regardless
// of the UI gate on these pages — same pattern used throughout.
export async function createModule(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Give the module/week a name." };

    const course = await getCurrentCourse();
    if (!course) return { error: "No active course found — pick a term before adding modules." };

    const supabase = await createClient();
    const { data: last } = await supabase
      .from("modules")
      .select("position")
      .eq("course_id", course.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("modules").insert({
      course_id: course.id,
      name,
      position: (last?.position ?? -1) + 1,
      published: false,
    });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't create the module. Try again." };
  }

  revalidatePath("/modules");
  return {};
}

export async function toggleModulePublished(moduleId: string, currentlyPublished: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("modules")
    .update({ published: !currentlyPublished })
    .eq("id", moduleId);
  if (error) throw new Error(error.message);
  revalidatePath("/modules");
}

export async function deleteModule(moduleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) throw new Error(error.message);
  revalidatePath("/modules");
}

export async function addModuleItem(
  moduleId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const itemType = String(formData.get("item_type") ?? "");
    if (!["assignment", "page", "quiz", "url", "header"].includes(itemType)) {
      return { error: "Pick what this item links to." };
    }

    const supabase = await createClient();
    const { data: last } = await supabase
      .from("module_items")
      .select("position")
      .eq("module_id", moduleId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const position = (last?.position ?? -1) + 1;

    // Header and URL rows carry their own title; the others derive their
    // title from the referenced object so the module always shows the
    // real current name.
    const row: Record<string, unknown> = {
      module_id: moduleId,
      position,
      item_type: itemType,
    };

    if (itemType === "header") {
      const title = String(formData.get("title") ?? "").trim();
      if (!title) return { error: "Give the header some text." };
      row.title = title;
    } else if (itemType === "url") {
      const title = String(formData.get("title") ?? "").trim();
      const url = String(formData.get("url") ?? "").trim();
      if (!title) return { error: "Give the link some text." };
      if (!url) return { error: "Add the URL this link should point to." };
      row.title = title;
      row.url = url;
    } else {
      const refId = String(formData.get("ref_id") ?? "");
      if (!refId) return { error: "Pick which item to add." };
      const table =
        itemType === "assignment" ? "assignments" : itemType === "page" ? "wiki_pages" : "quizzes";
      const titleCol = itemType === "quiz" ? "title" : itemType === "page" ? "title" : "title";
      const { data: ref } = await supabase.from(table).select(`id, ${titleCol}`).eq("id", refId).maybeSingle();
      if (!ref) return { error: "That item no longer exists — refresh and try again." };
      row.title = (ref as Record<string, string>)[titleCol];
      row[`${itemType}_id`] = refId;
    }

    const { error } = await supabase.from("module_items").insert(row);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't add the item. Try again." };
  }

  revalidatePath("/modules");
  return {};
}

export async function deleteModuleItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("module_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/modules");
}

// Reorder a module among its course's modules by swapping positions with
// the neighbor in the chosen direction. Positions are sequential+unique
// (createModule increments from max), so a straight swap is enough. RLS
// re-enforces exec on the writes.
export async function moveModule(moduleId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data: mod } = await supabase
    .from("modules")
    .select("course_id")
    .eq("id", moduleId)
    .maybeSingle();
  if (!mod) return;

  const { data: modules } = await supabase
    .from("modules")
    .select("id, position")
    .eq("course_id", mod.course_id)
    .order("position", { ascending: true });
  const list = (modules ?? []) as { id: string; position: number }[];

  const idx = list.findIndex((m) => m.id === moduleId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return;

  const a = list[idx];
  const b = list[swapIdx];
  const { error: e1 } = await supabase.from("modules").update({ position: b.position }).eq("id", a.id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from("modules").update({ position: a.position }).eq("id", b.id);
  if (e2) throw new Error(e2.message);

  revalidatePath("/modules");
}

// Reorder an item within its module. Same swap approach as moveModule.
export async function moveModuleItem(itemId: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("module_items")
    .select("module_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return;

  const { data: items } = await supabase
    .from("module_items")
    .select("id, position")
    .eq("module_id", item.module_id)
    .order("position", { ascending: true });
  const list = (items ?? []) as { id: string; position: number }[];

  const idx = list.findIndex((it) => it.id === itemId);
  if (idx === -1) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return;

  const a = list[idx];
  const b = list[swapIdx];
  const { error: e1 } = await supabase
    .from("module_items")
    .update({ position: b.position })
    .eq("id", a.id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase
    .from("module_items")
    .update({ position: a.position })
    .eq("id", b.id);
  if (e2) throw new Error(e2.message);

  revalidatePath("/modules");
}
