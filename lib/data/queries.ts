import "server-only";
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

/**
 * The single active course for the current term. UREC only runs one
 * course today (UREC Analyst Program), so there's no course switcher
 * yet — this picks the course under whichever term is marked current.
 */
export async function getCurrentCourse() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, code, term:terms!inner(name, is_current)")
    .eq("terms.is_current", true)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
}

/** Signed URL valid for 5 minutes — files live in a private bucket. */
export async function getSignedFileUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("submissions")
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
