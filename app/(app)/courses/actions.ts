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
