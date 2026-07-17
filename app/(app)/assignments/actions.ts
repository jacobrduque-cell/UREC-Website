"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment, error: aErr } = await supabase
    .from("assignments")
    .select("id, course_id, submission_type")
    .eq("id", assignmentId)
    .single();
  if (aErr || !assignment) {
    throw new Error("Assignment not found.");
  }

  let bodyText: string | null = null;
  let url: string | null = null;

  if (assignment.submission_type === "text") {
    bodyText = String(formData.get("body_text") ?? "").trim();
    if (!bodyText) throw new Error("Enter your submission text.");
  } else if (assignment.submission_type === "url") {
    url = String(formData.get("url") ?? "").trim();
    if (!url) throw new Error("Enter a URL.");
  }

  const { data: submission, error: sErr } = await supabase
    .from("submissions")
    .insert({
      assignment_id: assignmentId,
      user_id: user.id,
      body_text: bodyText,
      url,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(sErr.message);

  if (assignment.submission_type === "file") {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      throw new Error("Choose a file to upload.");
    }

    const path = `${assignmentId}/${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("submissions")
      .upload(path, file, { contentType: file.type });
    if (upErr) throw new Error(upErr.message);

    const { data: fileRow, error: fErr } = await supabase
      .from("files")
      .insert({
        course_id: assignment.course_id,
        uploaded_by: user.id,
        storage_path: path,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      })
      .select("id")
      .single();
    if (fErr) throw new Error(fErr.message);

    const { error: sfErr } = await supabase.from("submission_files").insert({
      submission_id: submission.id,
      file_id: fileRow.id,
    });
    if (sfErr) throw new Error(sfErr.message);
  }

  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/assignments");
  redirect(`/assignments/${assignmentId}`);
}

export async function gradeSubmission(
  submissionId: string,
  assignmentId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pointsEarned = Number(formData.get("points_earned"));
  if (Number.isNaN(pointsEarned) || pointsEarned < 0) {
    throw new Error("Enter a valid score.");
  }

  // RLS re-enforces exec-only on grades regardless of the UI gate on
  // this page — same pattern as announcements.
  const { error } = await supabase.from("grades").upsert(
    {
      submission_id: submissionId,
      points_earned: pointsEarned,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/assignments/${assignmentId}/grade`);
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/grades");
}
