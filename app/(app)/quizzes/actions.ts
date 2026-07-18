"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCourse } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// RLS re-enforces exec-only on quiz authoring regardless of the UI gate.
export async function createQuiz(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const supabase = await createClient();
  const course = await getCurrentCourse();
  if (!course) throw new Error("No active course found.");

  const { data, error } = await supabase
    .from("quizzes")
    .insert({ course_id: course.id, title, description: description || null, published: false })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/quizzes");
  redirect(`/quizzes/${data.id}`);
}

export async function addQuestion(quizId: string, formData: FormData) {
  const questionText = String(formData.get("question_text") ?? "").trim();
  const questionType = String(formData.get("question_type") ?? "");
  const points = Number(formData.get("points"));
  if (!questionText) throw new Error("Question text is required.");
  if (!["multiple_choice", "true_false", "short_answer", "essay"].includes(questionType)) {
    throw new Error("Invalid question type.");
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("quiz_questions")
    .select("position")
    .eq("quiz_id", quizId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: question, error } = await supabase
    .from("quiz_questions")
    .insert({
      quiz_id: quizId,
      question_text: questionText,
      question_type: questionType,
      points: Number.isNaN(points) ? 1 : points,
      position: (last?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Build answer options for the objective types.
  const answers: { question_id: string; answer_text: string; is_correct: boolean; position: number }[] = [];
  if (questionType === "true_false") {
    const correct = String(formData.get("tf_correct") ?? "true");
    answers.push({ question_id: question.id, answer_text: "True", is_correct: correct === "true", position: 0 });
    answers.push({ question_id: question.id, answer_text: "False", is_correct: correct === "false", position: 1 });
  } else if (questionType === "multiple_choice") {
    const correctIdx = String(formData.get("mc_correct") ?? "0");
    for (let i = 0; i < 5; i++) {
      const text = String(formData.get(`option_${i}`) ?? "").trim();
      if (!text) continue;
      answers.push({ question_id: question.id, answer_text: text, is_correct: String(i) === correctIdx, position: i });
    }
    if (answers.length < 2) throw new Error("Add at least two options for a multiple-choice question.");
    if (!answers.some((a) => a.is_correct)) throw new Error("Mark one option as correct.");
  }

  if (answers.length > 0) {
    const { error: aErr } = await supabase.from("quiz_answers").insert(answers);
    if (aErr) throw new Error(aErr.message);
  }

  revalidatePath(`/quizzes/${quizId}`);
}

export async function toggleQuizPublished(quizId: string, currentlyPublished: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .update({ published: !currentlyPublished })
    .eq("id", quizId);
  if (error) throw new Error(error.message);
  revalidatePath("/quizzes");
  revalidatePath(`/quizzes/${quizId}`);
}

/**
 * Student submits a quiz attempt. Grading uses the admin client so the
 * authoritative is_correct flags are read server-side and never trusted
 * from the client. Objective questions (MC/TF) auto-grade; short-answer
 * and essay are left ungraded (null) for exec to review — matching how
 * Canvas can't auto-grade free text.
 */
export async function submitQuiz(quizId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Gate visibility through RLS with the USER's client: a member can
  // only read a quiz that's published and in a course they're enrolled
  // in (or exec). If this returns nothing, they aren't allowed to take
  // it — stop before any admin-client writes bypass RLS.
  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, published")
    .eq("id", quizId)
    .maybeSingle();
  if (!quiz || !quiz.published) {
    throw new Error("This quiz isn't available.");
  }

  // Every write below uses the admin client so students never touch the
  // quiz_submissions/quiz_responses tables directly. The score column is
  // computed here from the authoritative answer keys and can't be set by
  // the client — RLS on those tables is exec-only (see migration
  // 20260717001700), so the only way in is through this action.
  const admin = createAdminClient();
  const { data: questions } = await admin
    .from("quiz_questions")
    .select("id, question_type, points, quiz_answers(id, is_correct)")
    .eq("quiz_id", quizId);

  const { data: submission, error: sErr } = await admin
    .from("quiz_submissions")
    .upsert(
      { quiz_id: quizId, user_id: user.id, submitted_at: new Date().toISOString() },
      { onConflict: "quiz_id,user_id" },
    )
    .select("id")
    .single();
  if (sErr) throw new Error(sErr.message);

  let score = 0;
  const responses = [];
  for (const q of questions ?? []) {
    const raw = String(formData.get(`q_${q.id}`) ?? "").trim();
    let isCorrect: boolean | null = null;
    if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
      const answers = (q.quiz_answers ?? []) as { id: string; is_correct: boolean }[];
      const chosen = answers.find((a) => a.id === raw);
      isCorrect = Boolean(chosen?.is_correct);
      if (isCorrect) score += Number(q.points);
    }
    responses.push({
      quiz_submission_id: submission.id,
      question_id: q.id,
      response_text: raw || null,
      is_correct: isCorrect,
    });
  }

  // Replace any prior responses for this submission, then insert fresh.
  await admin.from("quiz_responses").delete().eq("quiz_submission_id", submission.id);
  if (responses.length > 0) {
    await admin.from("quiz_responses").insert(responses);
  }
  await admin.from("quiz_submissions").update({ score }).eq("id", submission.id);

  revalidatePath(`/quizzes/${quizId}`);
  redirect(`/quizzes/${quizId}`);
}
