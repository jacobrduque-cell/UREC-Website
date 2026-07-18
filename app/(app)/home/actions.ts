"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// The course front page is stored as a wiki_pages row with the reserved
// slug "home" (always published so enrolled members see it) — same
// pattern as the syllabus, reusing wiki_pages + its RLS + markdown
// rendering rather than a new table. RLS enforces exec-only writes.
export async function saveHome(
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
      .eq("slug", "home")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("wiki_pages")
        .update({ body_markdown: bodyMarkdown, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) return { error: `Couldn't save the front page: ${error.message}` };
    } else {
      const { error } = await supabase.from("wiki_pages").insert({
        course_id: course.id,
        title: "Course Home",
        slug: "home",
        body_markdown: bodyMarkdown,
        published: true,
        created_by: user.id,
      });
      if (error) return { error: `Couldn't save the front page: ${error.message}` };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't save the front page. Try again.",
    };
  }

  revalidatePath("/home");
  redirect("/home");
}
