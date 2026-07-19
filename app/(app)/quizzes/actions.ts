"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCourse, getIsExec, oneOrFirst } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// RLS re-enforces exec-only on quiz authoring regardless of the UI gate.
export async function createQuiz(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  let newId = "";
  try {
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    if (!title) return { error: "Give the quiz a title." };

    const supabase = await createClient();
    const course = await getCurrentCourse();
    if (!course) {
      return { error: "No active course found — set an active course before creating a quiz." };
    }

    const { data, error } = await supabase
      .from("quizzes")
      .insert({ course_id: course.id, title, description: description || null, published: false })
      .select("id")
      .single();
    if (error) return { error: error.message };
    newId = data.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't create the quiz. Try again." };
  }

  revalidatePath("/quizzes");
  redirect(`/quizzes/${newId}`);
}

export async function addQuestion(
  quizId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const questionText = String(formData.get("question_text") ?? "").trim();
    const questionType = String(formData.get("question_type") ?? "");
    const points = Number(formData.get("points"));
    if (!questionText) return { error: "Enter the question text." };
    if (
      ![
        "multiple_choice",
        "true_false",
        "short_answer",
        "essay",
        "numeric",
        "multiple_answer",
      ].includes(questionType)
    ) {
      return { error: "Choose a valid question type." };
    }

    const supabase = await createClient();
    const { data: last } = await supabase
      .from("quiz_questions")
      .select("position")
      .eq("quiz_id", quizId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const explanation = String(formData.get("explanation") ?? "").trim() || null;
    const { data: question, error } = await supabase
      .from("quiz_questions")
      .insert({
        quiz_id: quizId,
        question_text: questionText,
        question_type: questionType,
        points: Number.isNaN(points) ? 1 : points,
        position: (last?.position ?? -1) + 1,
        explanation,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };

    // Build answer options for the objective types.
    const answers: {
      question_id: string;
      answer_text: string;
      is_correct: boolean;
      position: number;
      tolerance?: number | null;
    }[] = [];
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
      if (answers.length < 2) {
        return { error: "Multiple-choice questions need at least two answer options." };
      }
      if (!answers.some((a) => a.is_correct)) return { error: "Mark which option is correct." };
    } else if (questionType === "multiple_answer") {
      // Select-all-that-apply: each option can be independently correct.
      for (let i = 0; i < 5; i++) {
        const text = String(formData.get(`option_${i}`) ?? "").trim();
        if (!text) continue;
        const isCorrect = formData.get(`ma_correct_${i}`) === "on";
        answers.push({ question_id: question.id, answer_text: text, is_correct: isCorrect, position: i });
      }
      if (answers.length < 2) {
        return { error: "Multiple-answer questions need at least two answer options." };
      }
      if (!answers.some((a) => a.is_correct)) {
        return { error: "Mark at least one option as correct." };
      }
    } else if (questionType === "numeric") {
      // Store the correct value + tolerance as one exec-only answer row.
      const value = Number(formData.get("numeric_answer"));
      if (Number.isNaN(value)) return { error: "Numeric answers need a correct value." };
      const tolRaw = Number(formData.get("numeric_tolerance"));
      const tolerance = Number.isNaN(tolRaw) ? 0 : Math.abs(tolRaw);
      answers.push({
        question_id: question.id,
        answer_text: String(value),
        is_correct: true,
        position: 0,
        tolerance,
      });
    }

    if (answers.length > 0) {
      const { error: aErr } = await supabase.from("quiz_answers").insert(answers);
      if (aErr) return { error: aErr.message };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't add the question. Try again." };
  }

  revalidatePath(`/quizzes/${quizId}`);
  return {};
}

// Quiz behavior settings (exec). RLS re-enforces exec-only on the write.
export async function updateQuizSettings(
  quizId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("quizzes")
      .update({
        shuffle_questions: formData.get("shuffle_questions") === "on",
        show_correct_after: formData.get("show_correct_after") === "on",
      })
      .eq("id", quizId);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't save settings. Try again." };
  }

  revalidatePath(`/quizzes/${quizId}`);
  return {};
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

// Delete a quiz and its questions (cascade). RLS re-enforces exec.
// Guarded against destroying attempts: deleting a quiz cascades away
// every student submission/response, so we refuse when any exist (the UI
// only offers Delete when there are none). Drafts delete cleanly.
export async function deleteQuiz(quizId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("quiz_submissions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quizId);
  if ((count ?? 0) > 0) {
    throw new Error(
      "Students have already taken this quiz — unpublish it instead of deleting, to keep their attempts.",
    );
  }

  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw new Error(error.message);

  revalidatePath("/quizzes");
  redirect("/quizzes");
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
    .select("id, question_type, points, quiz_answers(id, is_correct, answer_text, tolerance)")
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

  type AnswerRow = { id: string; is_correct: boolean; answer_text: string; tolerance: number | null };
  let score = 0;
  const responses = [];
  for (const q of questions ?? []) {
    const answers = (q.quiz_answers ?? []) as AnswerRow[];
    let isCorrect: boolean | null = null;
    let responseText: string | null = null;

    if (q.question_type === "multiple_choice" || q.question_type === "true_false") {
      const raw = String(formData.get(`q_${q.id}`) ?? "").trim();
      responseText = raw || null;
      const chosen = answers.find((a) => a.id === raw);
      isCorrect = Boolean(chosen?.is_correct);
      if (isCorrect) score += Number(q.points);
    } else if (q.question_type === "multiple_answer") {
      // Select-all: correct only if the chosen set is exactly the key set.
      const chosen = [...new Set(formData.getAll(`q_${q.id}`).map(String))].sort();
      responseText = chosen.join(",") || null;
      const key = answers.filter((a) => a.is_correct).map((a) => a.id).sort();
      isCorrect =
        key.length > 0 && key.length === chosen.length && key.every((id, i) => id === chosen[i]);
      if (isCorrect) score += Number(q.points);
    } else if (q.question_type === "numeric") {
      const raw = String(formData.get(`q_${q.id}`) ?? "").trim();
      responseText = raw || null;
      const key = answers[0];
      const resp = Number(raw);
      const target = key ? Number(key.answer_text) : NaN;
      const tol = key ? Number(key.tolerance ?? 0) : 0;
      isCorrect =
        raw !== "" && !Number.isNaN(resp) && !Number.isNaN(target) && Math.abs(resp - target) <= tol;
      if (isCorrect) score += Number(q.points);
    } else {
      // short_answer / essay — recorded for exec to grade later.
      const raw = String(formData.get(`q_${q.id}`) ?? "").trim();
      responseText = raw || null;
    }

    responses.push({
      quiz_submission_id: submission.id,
      question_id: q.id,
      response_text: responseText,
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

/**
 * Exec grades the written (short-answer/essay) responses on one quiz
 * submission, awarding points per response, then recomputes the total
 * score = auto-graded MC/TF points + awarded written points. Exec-gated
 * in code and re-enforced by RLS (quiz_responses/quiz_submissions are
 * exec-write). Auto-graded question scoring is never touched here.
 */
export async function gradeQuizResponses(
  quizSubmissionId: string,
  quizId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  if (!(await getIsExec())) throw new Error("Only exec can grade quizzes.");

  const { data: responses } = await supabase
    .from("quiz_responses")
    .select("id, is_correct, question:quiz_questions(points, question_type)")
    .eq("quiz_submission_id", quizSubmissionId);

  let score = 0;
  for (const r of responses ?? []) {
    const q = oneOrFirst(r.question) as { points: number; question_type: string } | undefined;
    const pts = Number(q?.points ?? 0);
    const type = q?.question_type;
    if (type === "multiple_choice" || type === "true_false") {
      if (r.is_correct) score += pts;
    } else {
      const raw = Number(formData.get(`award_${r.id}`));
      const awarded = Number.isNaN(raw) ? 0 : Math.min(Math.max(raw, 0), pts);
      const { error } = await supabase
        .from("quiz_responses")
        .update({ points_awarded: awarded })
        .eq("id", r.id);
      if (error) throw new Error(error.message);
      score += awarded;
    }
  }

  const { error: sErr } = await supabase
    .from("quiz_submissions")
    .update({ score })
    .eq("id", quizSubmissionId);
  if (sErr) throw new Error(sErr.message);

  revalidatePath(`/quizzes/${quizId}/submissions`);
  revalidatePath(`/quizzes/${quizId}`);
}
