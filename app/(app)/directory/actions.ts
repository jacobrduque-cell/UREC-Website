"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
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

// Add people to the active course by pasting @berkeley.edu emails. A
// person who has already signed in is enrolled immediately; anyone who
// hasn't yet gets a pending_enrollments row that the signup trigger
// redeems on their first login. Runs under the admin (service-role)
// client after an explicit exec check — inserting an enrollment for
// someone else, and reading users across the whole table, is exactly
// what RLS forbids for a normal request, so we gate it in code instead.
export async function enrollMembers(formData: FormData) {
  if (!(await getIsExec())) throw new Error("Only exec can add people.");

  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const roleId = String(formData.get("role_id") ?? "").trim();
  if (!roleId) throw new Error("Pick a role.");
  const sectionId = String(formData.get("section_id") ?? "") || null;

  // Accept commas, whitespace, or newlines between addresses.
  const raw = String(formData.get("emails") ?? "");
  const emails = Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
  if (emails.length === 0) throw new Error("Enter at least one email.");

  const bad = emails.filter((e) => !e.endsWith("@berkeley.edu"));
  if (bad.length > 0) {
    throw new Error(`Not a @berkeley.edu address: ${bad.slice(0, 3).join(", ")}`);
  }

  const admin = createAdminClient();

  // Who already has an account? Those get real enrollments now; the rest
  // get parked as pending invites.
  const { data: existing } = await admin
    .from("users")
    .select("id, email")
    .in("email", emails);
  const byEmail = new Map(
    ((existing ?? []) as { id: string; email: string }[]).map((u) => [
      u.email.toLowerCase(),
      u.id,
    ]),
  );

  const enrollRows = emails
    .filter((e) => byEmail.has(e))
    .map((e) => ({
      user_id: byEmail.get(e)!,
      course_id: course.id,
      section_id: sectionId,
      role_id: roleId,
    }));
  const pendingRows = emails
    .filter((e) => !byEmail.has(e))
    .map((e) => ({
      email: e,
      course_id: course.id,
      section_id: sectionId,
      role_id: roleId,
    }));

  if (enrollRows.length > 0) {
    const { error } = await admin
      .from("enrollments")
      .upsert(enrollRows, { onConflict: "user_id,course_id" });
    if (error) throw new Error(error.message);
  }
  if (pendingRows.length > 0) {
    const { error } = await admin
      .from("pending_enrollments")
      .upsert(pendingRows, { onConflict: "email,course_id" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/directory");
}

export async function removeEnrollment(enrollmentId: string) {
  if (!(await getIsExec())) throw new Error("Only exec can remove people.");

  const admin = createAdminClient();
  const { error } = await admin.from("enrollments").delete().eq("id", enrollmentId);
  if (error) throw new Error(error.message);

  revalidatePath("/directory");
}

export async function removePending(pendingId: string) {
  if (!(await getIsExec())) throw new Error("Only exec can remove invites.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("pending_enrollments")
    .delete()
    .eq("id", pendingId);
  if (error) throw new Error(error.message);

  revalidatePath("/directory");
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
