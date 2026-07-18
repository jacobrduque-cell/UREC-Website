import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * PostgREST returns an embedded resource as an array when the
 * relationship is one-to-many, but as a single object when it detects
 * one-to-one (e.g. grades.submission_id is unique, so "a submission's
 * grades" comes back as one object, not a one-item array). Call sites
 * that read a to-one embed should go through this instead of assuming
 * either shape.
 */
export function oneOrFirst<T>(value: T | T[] | null | undefined): T | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/**
 * These wrap the same public.is_exec()/is_enrolled() functions the RLS
 * policies use (see supabase/migrations/20260717000100_rls_policies.sql),
 * called via RPC instead of reimplementing the role logic in TypeScript.
 * One source of truth for "is this user exec."
 */
export async function getIsExec(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_exec");
  if (error) return false;
  return Boolean(data);
}

export async function getIsEnrolled(courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_enrolled", {
    target_course_id: courseId,
  });
  if (error) return false;
  return Boolean(data);
}

/** Grader tier (Phase 6): can grade/view all submissions for a course without full exec power. */
export async function getIsGrader(courseId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_grader", {
    target_course_id: courseId,
  });
  if (error) return false;
  return Boolean(data);
}

/**
 * The viewer's group ids, optionally scoped to one course. Group
 * (team) submissions store `group_id` and leave `user_id` NULL, so any
 * "did I submit this?" / "my grades" / "my feedback" logic has to know
 * the viewer's groups or it silently drops every team submission. One
 * source of truth so /grades, the dashboard, and the course home all
 * expand group submissions the same way. A member can be in more than
 * one group in a course (a section study group AND a case-comp team),
 * so this returns an array — never assume a single membership.
 */
export async function getMyGroupIds(courseId?: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase
    .from("group_memberships")
    .select("group_id, group:groups!inner(course_id)")
    .eq("user_id", user.id)
    // Deterministic order so a member of two groups in one course
    // always resolves to the SAME "first" group in the assignment page
    // and the submit action — otherwise they could view one team's
    // submission but write to the other's.
    .order("group_id", { ascending: true });
  if (courseId) query = query.eq("group.course_id", courseId);
  const { data } = await query;
  return ((data ?? []) as { group_id: string }[]).map((r) => r.group_id);
}

/**
 * PostgREST `.or()` filter that matches a submission owned by this user
 * OR by any of their groups. Keep the string free of spaces — PostgREST
 * treats a space as the end of the filter.
 */
export function submissionOwnerFilter(userId: string, groupIds: string[]): string {
  return groupIds.length > 0
    ? `user_id.eq.${userId},group_id.in.(${groupIds.join(",")})`
    : `user_id.eq.${userId}`;
}

/**
 * The active course — the one whose content (assignments, files,
 * modules, people, …) the whole app is currently scoped to. Each
 * course is fully separate; entering a course from the dashboard sets
 * the `active_course_id` cookie (see app/enter/[courseId]/route.ts),
 * and every page reads its course id from here, so switching courses
 * re-scopes the entire second-sidebar experience at once.
 *
 * The lookup goes through RLS, so a cookie pointing at a course the
 * user can't access simply returns nothing and falls back to the
 * current term's course. First-time visitors (no cookie) also get the
 * current-term course.
 */
export async function getCurrentCourse() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("active_course_id")?.value;

  if (selectedId) {
    const { data } = await supabase
      .from("courses")
      .select("id, name, code, published, term:terms(name, is_current)")
      .eq("id", selectedId)
      .maybeSingle();
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, code, published, term:terms!inner(name, is_current)")
    .eq("terms.is_current", true)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

/** Signed URL valid for 5 minutes — every bucket in this project is private. */
export async function getSignedFileUrl(
  storagePath: string,
  bucket: "submissions" | "course-files" = "submissions",
) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 300);
  if (error) return null;
  return data.signedUrl;
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}
