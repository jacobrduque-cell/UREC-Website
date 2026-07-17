"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

// RLS re-enforces exec-only on course_sections/groups/enrollments/
// group_memberships writes regardless of the UI gate on these pages —
// same pattern used throughout.
export async function createSection(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Section name is required.");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_sections")
    .insert({ course_id: course.id, name });
  if (error) throw new Error(error.message);

  revalidatePath("/directory/sections");
}

export async function assignSection(enrollmentId: string, formData: FormData) {
  const sectionId = String(formData.get("section_id") ?? "") || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("enrollments")
    .update({ section_id: sectionId })
    .eq("id", enrollmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/directory");
  revalidatePath("/directory/sections");
}

export async function createGroup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Group name is required.");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .insert({ course_id: course.id, name });
  if (error) throw new Error(error.message);

  revalidatePath("/directory/groups");
}

export async function assignGroup(userId: string, groupId: string | null, formData: FormData) {
  const newGroupId = String(formData.get("group_id") ?? "") || null;

  const supabase = await createClient();

  if (groupId) {
    await supabase
      .from("group_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("group_id", groupId);
  }
  if (newGroupId) {
    const { error } = await supabase
      .from("group_memberships")
      .insert({ user_id: userId, group_id: newGroupId });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/directory/groups");
}
