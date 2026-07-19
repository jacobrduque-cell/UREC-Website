"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cloneCourseContent } from "./clone";

// RLS re-enforces exec-only on terms/courses writes regardless of the
// UI gate on this page — same pattern used throughout.
export async function createTermAndCourse(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const termName = String(formData.get("term_name") ?? "").trim();
    const startsOn = String(formData.get("starts_on") ?? "");
    const endsOn = String(formData.get("ends_on") ?? "");
    const courseName = String(formData.get("course_name") ?? "").trim();
    const courseCode = String(formData.get("course_code") ?? "").trim();
    const makeCurrent = formData.get("make_current") === "on";
    const copyFrom = String(formData.get("copy_from") ?? "").trim();

    if (!termName) return { error: "Name the term (e.g. Fall 2026)." };
    if (!startsOn || !endsOn) return { error: "Pick both a start and an end date for the term." };
    if (new Date(startsOn) >= new Date(endsOn)) {
      return { error: "The term's start date must come before its end date." };
    }
    if (!courseName) return { error: "Give the course a name." };

    const supabase = await createClient();

    if (makeCurrent) {
      await supabase.from("terms").update({ is_current: false }).eq("is_current", true);
    }

    const { data: term, error: tErr } = await supabase
      .from("terms")
      .insert({ name: termName, starts_on: startsOn, ends_on: endsOn, is_current: makeCurrent })
      .select("id")
      .single();
    if (tErr) return { error: tErr.message };

    const { data: course, error: cErr } = await supabase
      .from("courses")
      .insert({
        term_id: term.id,
        name: courseName,
        code: courseCode || null,
        published: false,
      })
      .select("id")
      .single();
    if (cErr) return { error: cErr.message };

    // Succession: optionally clone last term's content into the fresh
    // course so a new cohort's exec doesn't rebuild it by hand.
    if (copyFrom) {
      await cloneCourseContent(supabase, copyFrom, course.id, startsOn);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't create the term and course. Try again." };
  }

  revalidatePath("/courses");
  redirect("/courses");
}

export async function toggleCoursePublished(courseId: string, currentlyPublished: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ published: !currentlyPublished })
    .eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidatePath("/courses");
}

export async function setCurrentTerm(termId: string) {
  const supabase = await createClient();
  await supabase.from("terms").update({ is_current: false }).eq("is_current", true);
  const { error } = await supabase.from("terms").update({ is_current: true }).eq("id", termId);
  if (error) throw new Error(error.message);
  revalidatePath("/courses");
}

const COVER_MAX_BYTES = 5 * 1024 * 1024; // matches the content-images bucket cap
const COVER_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

// Upload a course cover into the public content-images bucket (under the
// exec's own folder, per that bucket's insert policy) and store its URL
// on the course. RLS re-enforces exec on the courses update. The card
// then lays the course color over it as a translucent film.
export async function setCourseCover(
  courseId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Your session expired — refresh and sign in again." };

    const file = formData.get("cover") as File | null;
    if (!file || file.size === 0) return { error: "Choose an image to upload." };
    if (!COVER_TYPES.has(file.type)) return { error: "Use a PNG, JPEG, GIF, or WebP image." };
    if (file.size > COVER_MAX_BYTES) return { error: "Image is too large (max 5 MB)." };

    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
    const path = `${user.id}/covers/${courseId}-${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("content-images")
      .upload(path, file, { contentType: file.type });
    if (upErr) return { error: upErr.message };

    const { data: pub } = supabase.storage.from("content-images").getPublicUrl(path);
    const { error } = await supabase
      .from("courses")
      .update({ cover_image_url: pub.publicUrl })
      .eq("id", courseId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't set the cover. Try again." };
  }

  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/home");
  return {};
}

export async function clearCourseCover(courseId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({ cover_image_url: null })
    .eq("id", courseId);
  if (error) throw new Error(error.message);
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  revalidatePath("/home");
}
