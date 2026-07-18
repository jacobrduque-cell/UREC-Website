"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// RLS re-enforces exec-only on wiki_pages writes regardless of the UI
// gate on these pages — same pattern as announcements and grades.
export async function createWikiPage(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");
  const published = formData.get("published") === "on";
  if (!title) throw new Error("Title is required.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const slug = slugify(title) || crypto.randomUUID().slice(0, 8);

  const { error } = await supabase.from("wiki_pages").insert({
    course_id: course.id,
    title,
    slug,
    body_markdown: bodyMarkdown,
    published,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/pages");
  redirect(`/pages/${slug}`);
}

export async function updateWikiPage(slug: string, formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const bodyMarkdown = String(formData.get("body_markdown") ?? "");
  const published = formData.get("published") === "on";
  if (!title) throw new Error("Title is required.");

  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  // Slugs are unique only PER course, so scope the update to the active
  // course — otherwise editing e.g. "resources" would overwrite the
  // identically-slugged page in every course cloned from this one.
  const { error } = await supabase
    .from("wiki_pages")
    .update({
      title,
      body_markdown: bodyMarkdown,
      published,
      updated_at: new Date().toISOString(),
    })
    .eq("course_id", course.id)
    .eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath("/pages");
  revalidatePath(`/pages/${slug}`);
  redirect(`/pages/${slug}`);
}

export async function toggleWikiPublished(
  slug: string,
  currentlyPublished: boolean,
) {
  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const { error } = await supabase
    .from("wiki_pages")
    .update({ published: !currentlyPublished })
    .eq("course_id", course.id)
    .eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath("/pages");
  revalidatePath(`/pages/${slug}`);
}
