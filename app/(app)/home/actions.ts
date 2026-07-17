"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// The course front page is stored as a wiki_pages row with the reserved
// slug "home" (always published so enrolled members see it) — same
// pattern as the syllabus, reusing wiki_pages + its RLS + markdown
// rendering rather than a new table. RLS enforces exec-only writes.
export async function saveHome(formData: FormData) {
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

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
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("wiki_pages").insert({
      course_id: course.id,
      title: "Course Home",
      slug: "home",
      body_markdown: bodyMarkdown,
      published: true,
      created_by: user.id,
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/home");
  redirect("/home");
}
