"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

// RLS re-enforces exec-only on modules/module_items writes regardless
// of the UI gate on these pages — same pattern used throughout.
export async function createModule(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Module name is required.");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

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
  if (error) throw new Error(error.message);

  revalidatePath("/modules");
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

export async function addModuleItem(moduleId: string, formData: FormData) {
  const itemType = String(formData.get("item_type") ?? "");
  if (!["assignment", "page", "quiz", "url", "header"].includes(itemType)) {
    throw new Error("Invalid item type.");
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
    if (!title) throw new Error("Header text is required.");
    row.title = title;
  } else if (itemType === "url") {
    const title = String(formData.get("title") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    if (!title || !url) throw new Error("Link text and URL are required.");
    row.title = title;
    row.url = url;
  } else {
    const refId = String(formData.get("ref_id") ?? "");
    if (!refId) throw new Error("Choose an item to add.");
    const table =
      itemType === "assignment" ? "assignments" : itemType === "page" ? "wiki_pages" : "quizzes";
    const titleCol = itemType === "quiz" ? "title" : itemType === "page" ? "title" : "title";
    const { data: ref } = await supabase.from(table).select(`id, ${titleCol}`).eq("id", refId).maybeSingle();
    if (!ref) throw new Error("That item no longer exists.");
    row.title = (ref as Record<string, string>)[titleCol];
    row[`${itemType}_id`] = refId;
  }

  const { error } = await supabase.from("module_items").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/modules");
}

export async function deleteModuleItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("module_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath("/modules");
}
