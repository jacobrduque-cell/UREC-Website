"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getMyGroupIds } from "@/lib/data/queries";
import { pacificWallClockToUtcISO } from "@/lib/timezone";
import { assertUploadSize } from "@/lib/uploads";
import { getCourseMemberIds, notifyUsers } from "@/lib/notifications";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function parseAssignmentFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pointsPossible = Number(formData.get("points_possible"));
  const dueAt = String(formData.get("due_at") ?? "");
  const unlockAt = String(formData.get("unlock_at") ?? "");
  const lockAt = String(formData.get("lock_at") ?? "");
  const submissionType = String(formData.get("submission_type") ?? "none");
  const acceptedFileTypesRaw = String(formData.get("accepted_file_types") ?? "").trim();
  const assignmentGroupId = String(formData.get("assignment_group_id") ?? "") || null;
  const published = formData.get("published") === "on";
  const allowGroupSubmission = formData.get("allow_group_submission") === "on";
  const rubricId = String(formData.get("rubric_id") ?? "") || null;

  if (!title) throw new Error("Title is required.");
  if (Number.isNaN(pointsPossible) || pointsPossible < 0) {
    throw new Error("Enter valid points possible.");
  }
  if (!["file", "text", "url", "none"].includes(submissionType)) {
    throw new Error("Invalid submission type.");
  }

  // datetime-local values are bare wall-clock strings; interpret them in
  // the club's Pacific zone (not the UTC server runtime) so a deadline
  // typed as 5:00 PM is stored and enforced as 5:00 PM Berkeley time.
  const unlockIso = pacificWallClockToUtcISO(unlockAt);
  const lockIso = pacificWallClockToUtcISO(lockAt);
  if (unlockIso && lockIso && new Date(unlockIso) >= new Date(lockIso)) {
    throw new Error("The available-from date must be before the closes date.");
  }

  return {
    title,
    description: description || null,
    points_possible: pointsPossible,
    due_at: pacificWallClockToUtcISO(dueAt),
    unlock_at: unlockIso,
    lock_at: lockIso,
    submission_type: submissionType,
    accepted_file_types: acceptedFileTypesRaw
      ? acceptedFileTypesRaw.split(",").map((t) => t.trim().replace(/^\./, "").toLowerCase()).filter(Boolean)
      : null,
    assignment_group_id: assignmentGroupId,
    published,
    allow_group_submission: allowGroupSubmission,
    rubricId,
  };
}

// RLS re-enforces exec-only on assignments/assignment_rubrics writes
// regardless of the UI gate on these pages — same pattern used
// throughout (announcements, grades, wiki_pages).
export async function createAssignment(formData: FormData) {
  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const fields = parseAssignmentFields(formData);
  const { rubricId, ...assignmentFields } = fields;

  const { data: assignment, error } = await supabase
    .from("assignments")
    .insert({ course_id: course.id, ...assignmentFields })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (rubricId) {
    const { error: rErr } = await supabase
      .from("assignment_rubrics")
      .insert({ assignment_id: assignment.id, rubric_id: rubricId });
    if (rErr) throw new Error(rErr.message);
  }

  if (fields.published) {
    const memberIds = await getCourseMemberIds(course.id);
    await notifyUsers(memberIds, {
      type: "new_assignment",
      title: `New assignment: ${fields.title}`,
      relatedEntityType: "assignment",
      relatedEntityId: assignment.id,
    });
  }

  revalidatePath("/assignments");
  redirect(`/assignments/${assignment.id}`);
}

export async function updateAssignment(assignmentId: string, formData: FormData) {
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("assignments")
    .select("published, course_id, title")
    .eq("id", assignmentId)
    .maybeSingle();

  const fields = parseAssignmentFields(formData);
  const { rubricId, ...assignmentFields } = fields;

  const { error } = await supabase
    .from("assignments")
    .update(assignmentFields)
    .eq("id", assignmentId);
  if (error) throw new Error(error.message);

  await supabase.from("assignment_rubrics").delete().eq("assignment_id", assignmentId);
  if (rubricId) {
    const { error: rErr } = await supabase
      .from("assignment_rubrics")
      .insert({ assignment_id: assignmentId, rubric_id: rubricId });
    if (rErr) throw new Error(rErr.message);
  }

  // Only notify on the transition from unpublished to published, not
  // on every subsequent edit.
  if (fields.published && before && !before.published) {
    const memberIds = await getCourseMemberIds(before.course_id);
    await notifyUsers(memberIds, {
      type: "new_assignment",
      title: `New assignment: ${fields.title}`,
      relatedEntityType: "assignment",
      relatedEntityId: assignmentId,
    });
  }

  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assignmentId}`);
  redirect(`/assignments/${assignmentId}`);
}

export async function createRubric(formData: FormData) {
  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Rubric title is required.");

  const { data: rubric, error } = await supabase
    .from("rubrics")
    .insert({ course_id: course.id, title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const criteria = [];
  for (let i = 0; i < 10; i++) {
    const criterion = String(formData.get(`criterion_${i}`) ?? "").trim();
    const description = String(formData.get(`description_${i}`) ?? "").trim();
    const points = Number(formData.get(`points_${i}`));
    if (!criterion || Number.isNaN(points)) continue;
    criteria.push({
      rubric_id: rubric.id,
      criterion,
      description,
      points,
      position: i,
    });
  }
  if (criteria.length === 0) {
    throw new Error("Add at least one criterion with a point value.");
  }

  const { error: cErr } = await supabase.from("rubric_criteria").insert(criteria);
  if (cErr) throw new Error(cErr.message);

  revalidatePath("/assignments/rubrics");
  redirect("/assignments/rubrics");
}

export async function submitAssignment(assignmentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: assignment, error: aErr } = await supabase
    .from("assignments")
    .select("id, course_id, submission_type, allow_group_submission, unlock_at, lock_at")
    .eq("id", assignmentId)
    .single();
  if (aErr || !assignment) {
    throw new Error("Assignment not found.");
  }

  // Enforce the availability window server-side — the UI hides the form
  // outside it, but a hand-crafted request must be rejected too.
  const now = Date.now();
  if (assignment.unlock_at && now < new Date(assignment.unlock_at).getTime()) {
    throw new Error("This assignment isn't open for submissions yet.");
  }
  if (assignment.lock_at && now > new Date(assignment.lock_at).getTime()) {
    throw new Error("Submissions for this assignment are closed.");
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

  // Group assignments submit/grade once per team instead of once per
  // person — find the student's group for this course (Directory →
  // Manage Groups is where exec assigns this). A member can belong to
  // more than one group in a course, so resolve the full list (not
  // .maybeSingle(), which errors on 2+ rows and would wrongly block the
  // submission) and pick the first — the same deterministic group the
  // assignment page shows the current submission for.
  let groupId: string | null = null;
  if (assignment.allow_group_submission) {
    const groupIds = await getMyGroupIds(assignment.course_id);
    if (groupIds.length === 0) {
      throw new Error(
        "This assignment submits once per team, and you're not in a group yet — ask exec to add you to one.",
      );
    }
    groupId = groupIds[0];
  }

  // One current row per student (or per group) per assignment
  // (submissions_one_per_user_per_assignment /
  // submissions_one_per_group_per_assignment) — a resubmission updates
  // that same row and bumps attempt_number, rather than inserting a
  // duplicate. This is what keeps grading pages, /grades, and
  // /assignments unambiguous about "the" grade for a student instead of
  // picking an arbitrary row among several.
  const ownerQuery = groupId
    ? supabase.from("submissions").select("id, attempt_number").eq("assignment_id", assignmentId).eq("group_id", groupId)
    : supabase.from("submissions").select("id, attempt_number").eq("assignment_id", assignmentId).eq("user_id", user.id);
  const { data: existing } = await ownerQuery.maybeSingle();

  let submissionId: string;
  if (existing) {
    const { error: uErr } = await supabase
      .from("submissions")
      .update({
        body_text: bodyText,
        url,
        submitted_at: new Date().toISOString(),
        attempt_number: existing.attempt_number + 1,
      })
      .eq("id", existing.id);
    if (uErr) throw new Error(uErr.message);
    submissionId = existing.id;

    if (assignment.submission_type === "file") {
      // The old attempt's file(s) no longer apply to the current attempt.
      await supabase.from("submission_files").delete().eq("submission_id", submissionId);
    }
  } else {
    const { data: submission, error: sErr } = await supabase
      .from("submissions")
      .insert({
        assignment_id: assignmentId,
        user_id: groupId ? null : user.id,
        group_id: groupId,
        body_text: bodyText,
        url,
      })
      .select("id")
      .single();
    if (sErr) throw new Error(sErr.message);
    submissionId = submission.id;
  }

  if (assignment.submission_type === "file") {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      throw new Error("Choose a file to upload.");
    }
    assertUploadSize(file);

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
        // A submission file is private to the submitter/team/graders —
        // NOT a published course-repository file. Without this it would
        // default to published=true and every enrolled member could
        // enumerate everyone's submission filenames via the files table
        // (and it would show up in the Files browser).
        published: false,
      })
      .select("id")
      .single();
    if (fErr) throw new Error(fErr.message);

    const { error: sfErr } = await supabase.from("submission_files").insert({
      submission_id: submissionId,
      file_id: fileRow.id,
    });
    if (sfErr) throw new Error(sfErr.message);
  }

  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/assignments");
  revalidatePath(`/assignments/${assignmentId}/grade`);
  redirect(`/assignments/${assignmentId}`);
}

export async function gradeSubmission(
  submissionId: string,
  assignmentId: string,
  rubricCriteria: { id: string; points: number }[] | null,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let pointsEarned: number;
  let rubricAssessment: Record<string, { points: number; comment: string | null }> | null = null;

  if (rubricCriteria && rubricCriteria.length > 0) {
    rubricAssessment = {};
    let total = 0;
    for (const criterion of rubricCriteria) {
      const raw = Number(formData.get(`rubric_score_${criterion.id}`));
      const score = Number.isNaN(raw) ? 0 : Math.min(Math.max(raw, 0), criterion.points);
      const comment = String(formData.get(`rubric_comment_${criterion.id}`) ?? "").trim();
      rubricAssessment[criterion.id] = { points: score, comment: comment || null };
      total += score;
    }
    pointsEarned = total;
  } else {
    pointsEarned = Number(formData.get("points_earned"));
    if (Number.isNaN(pointsEarned) || pointsEarned < 0) {
      throw new Error("Enter a valid score.");
    }
  }

  // RLS re-enforces exec/grader-only on grades regardless of the UI
  // gate on this page — same pattern as announcements.
  const { error } = await supabase.from("grades").upsert(
    {
      submission_id: submissionId,
      points_earned: pointsEarned,
      rubric_assessment: rubricAssessment,
      graded_by: user.id,
      graded_at: new Date().toISOString(),
    },
    { onConflict: "submission_id" },
  );
  if (error) throw new Error(error.message);

  const [{ data: submission }, { data: assignment }] = await Promise.all([
    supabase
      .from("submissions")
      .select("user_id, group_id")
      .eq("id", submissionId)
      .maybeSingle(),
    supabase
      .from("assignments")
      .select("title, points_possible")
      .eq("id", assignmentId)
      .maybeSingle(),
  ]);

  let recipientIds: string[] = [];
  if (submission?.user_id) {
    recipientIds = [submission.user_id];
  } else if (submission?.group_id) {
    const { data: members } = await supabase
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", submission.group_id);
    recipientIds = (members ?? []).map((m) => m.user_id);
  }

  if (assignment && recipientIds.length > 0) {
    await notifyUsers(recipientIds, {
      type: "assignment_graded",
      title: `${assignment.title} was graded`,
      body: `${pointsEarned}/${assignment.points_possible} pts`,
      relatedEntityType: "assignment",
      relatedEntityId: assignmentId,
    });
  }

  revalidatePath(`/assignments/${assignmentId}/grade`);
  revalidatePath(`/assignments/${assignmentId}`);
  revalidatePath("/grades");
}

export async function addSubmissionComment(
  submissionId: string,
  assignmentId: string,
  formData: FormData,
) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("submission_comments").insert({
    submission_id: submissionId,
    author_id: user.id,
    body,
  });
  if (error) throw new Error(error.message);

  const { data: submission } = await supabase
    .from("submissions")
    .select("user_id, group_id")
    .eq("id", submissionId)
    .maybeSingle();

  // Notify the submitter(s) — for a group submission that's every
  // teammate (same fan-out gradeSubmission uses) — but never the person
  // who just wrote the comment.
  let recipientIds: string[] = [];
  if (submission?.user_id) {
    recipientIds = [submission.user_id];
  } else if (submission?.group_id) {
    const { data: members } = await supabase
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", submission.group_id);
    recipientIds = (members ?? []).map((m) => m.user_id);
  }
  recipientIds = recipientIds.filter((id) => id !== user.id);

  if (recipientIds.length > 0) {
    await notifyUsers(recipientIds, {
      type: "assignment_graded",
      title: "New comment on your submission",
      body: body.slice(0, 140),
      relatedEntityType: "assignment",
      relatedEntityId: assignmentId,
    });
  }

  revalidatePath(`/assignments/${assignmentId}/grade`);
  revalidatePath(`/assignments/${assignmentId}`);
}
