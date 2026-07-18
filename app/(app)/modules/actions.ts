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
