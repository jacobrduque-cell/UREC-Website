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
export async function createWikiPage(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  let slug = "";
  try {
    const title = String(formData.get("title") ?? "").trim();
    const bodyMarkdown = String(formData.get("body_markdown") ?? "");
    const published = formData.get("published") === "on";
    if (!title) return { error: "Give the page a title." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Your session expired — refresh the page and sign in again." };
    }

    const course = await getCurrentCourse();
    if (!course) {
      return { error: "No active course — open a course from the dashboard first, then create the page inside it." };
    }

    slug = slugify(title) || crypto.randomUUID().slice(0, 8);

    const { error } = await supabase.from("wiki_pages").insert({
      course_id: course.id,
      title,
      slug,
      body_markdown: bodyMarkdown,
      published,
      created_by: user.id,
    });
    if (error) {
      // A unique-violation (Postgres 23505) means the slug already exists
      // in this course — surface it as a friendly, actionable message
      // instead of the raw DB text.
      if (error.code === "23505") {
        return { error: "A page with that title already exists — pick a different one." };
      }
      return { error: error.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't create the page. Try again." };
  }

  revalidatePath("/pages");
  redirect(`/pages/${slug}`);
}

export async function updateWikiPage(
  slug: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const title = String(formData.get("title") ?? "").trim();
    const bodyMarkdown = String(formData.get("body_markdown") ?? "");
    const published = formData.get("published") === "on";
    if (!title) return { error: "Give the page a title." };

    const supabase = await createClient();
    const course = await getCurrentCourse();
    if (!course) {
      return { error: "No active course — open a course from the dashboard first, then edit the page inside it." };
    }

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
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save the page. Try again." };
  }

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

// Delete a wiki page. RLS re-enforces exec. Any module items pointing at
// the page cascade away with it (module_items.page_id ON DELETE CASCADE),
// so there's no orphaned reference. The Syllabus lives as a reserved-slug
// wiki page edited on its own route — never delete it here.
export async function deleteWikiPage(slug: string) {
  if (slug === "syllabus") {
    throw new Error("The syllabus can't be deleted — clear it from the Syllabus editor instead.");
  }

  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const { error } = await supabase
    .from("wiki_pages")
    .delete()
    .eq("course_id", course.id)
    .eq("slug", slug);
  if (error) throw new Error(error.message);

  revalidatePath("/pages");
  redirect("/pages");
}
