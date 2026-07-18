"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// The syllabus is stored as a wiki_pages row with the reserved slug
// "syllabus" (always published so enrolled members can read it) — reuses
// the existing wiki_pages table, RLS (wiki_pages_write_exec), and
// markdown rendering rather than adding a new table. RLS re-enforces
// exec-only on the write regardless of the UI gate.
export async function saveSyllabus(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return { error: "Your session expired — refresh the page and sign in again." };

    const course = await getCurrentCourse();
    if (!course)
      return { error: "No active course found. Refresh and try again." };

    const { data: existing } = await supabase
      .from("wiki_pages")
      .select("id")
      .eq("course_id", course.id)
      .eq("slug", "syllabus")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wiki_pages")
        .update({ body_markdown: bodyMarkdown, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return { error: `Couldn't save the syllabus: ${error.message}` };
    } else {
      const { error } = await supabase.from("wiki_pages").insert({
        course_id: course.id,
        title: "Course Syllabus",
        slug: "syllabus",
        body_markdown: bodyMarkdown,
        published: true,
        created_by: user.id,
      });
      if (error) return { error: `Couldn't save the syllabus: ${error.message}` };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't save the syllabus. Try again.",
    };
  }

  revalidatePath("/syllabus");
  redirect("/syllabus");
}
