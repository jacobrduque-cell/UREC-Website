import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Deep-clone a course's CONTENT (not its people or their work) into a
// freshly created course. This is the succession feature: a new cohort's
// exec picks last term's course and starts with all its assignments,
// rubrics, modules, pages, quizzes, and calendar events already in place
// — as a draft, ready to tweak — instead of rebuilding by hand.
//
// What is copied: assignment_groups, rubrics (+criteria), assignments
// (+assignment_rubrics), wiki_pages (incl. reserved home/syllabus),
// quizzes (+questions +answers), modules (+items), calendar_events.
// Dates (due_at, event start/end) are shifted by the offset between the
// old and new term start so a week-3 deadline lands in the new week 3.
//
// What is NOT copied: enrollments, submissions, grades, announcements,
// discussions, notifications, quiz attempts — those belong to the old
// cohort. Course-repository files are skipped too (their bytes live in
// storage; a metadata-only copy would dangle), so module items that
// point at a file are omitted.
//
// Runs with the caller's client: the course action already gates this to
// exec, and RLS lets exec read the source and write the destination.

type DB = SupabaseClient;

function dayOffsetShifter(fromStartsOn: string, toStartsOn: string) {
  const from = new Date(fromStartsOn).getTime();
  const to = new Date(toStartsOn).getTime();
  const deltaMs = Number.isFinite(from) && Number.isFinite(to) ? to - from : 0;
  return (iso: string | null) => {
    if (!iso) return null;
    return new Date(new Date(iso).getTime() + deltaMs).toISOString();
  };
}

export async function cloneCourseContent(
  db: DB,
  sourceCourseId: string,
  destCourseId: string,
  destTermStartsOn: string,
) {
  // Who is doing this — needed for not-null created_by columns.
  const {
    data: { user },
  } = await db.auth.getUser();
  const actorId = user?.id;
  if (!actorId) throw new Error("Not signed in.");

  // Date shift keyed off each course's term start.
  const { data: srcCourse } = await db
    .from("courses")
    .select("term:terms(starts_on)")
    .eq("id", sourceCourseId)
    .maybeSingle();
  const srcStartsOn =
    (srcCourse as { term?: { starts_on?: string } } | null)?.term?.starts_on ?? destTermStartsOn;
  const shift = dayOffsetShifter(srcStartsOn, destTermStartsOn);

  // id-remap tables: old id -> new id.
  const groupMap = new Map<string, string>();
  const rubricMap = new Map<string, string>();
  const assignmentMap = new Map<string, string>();
  const pageMap = new Map<string, string>();
  const quizMap = new Map<string, string>();
  const moduleMap = new Map<string, string>();

  // Helper: insert a row and return its new id.
  async function insertReturning(table: string, row: Record<string, unknown>) {
    const { data, error } = await db.from(table).insert(row).select("id").single();
    if (error) throw new Error(`clone ${table}: ${error.message}`);
    return data.id as string;
  }

  // 1. assignment_groups
  const { data: groups } = await db
    .from("assignment_groups")
    .select("id, name, weight_pct, position")
    .eq("course_id", sourceCourseId);
  for (const g of groups ?? []) {
    const newId = await insertReturning("assignment_groups", {
      course_id: destCourseId,
      name: g.name,
      weight_pct: g.weight_pct,
      position: g.position,
    });
    groupMap.set(g.id, newId);
  }

  // 2. rubrics + criteria
  const { data: rubrics } = await db
    .from("rubrics")
    .select("id, title")
    .eq("course_id", sourceCourseId);
  for (const r of rubrics ?? []) {
    const newId = await insertReturning("rubrics", { course_id: destCourseId, title: r.title });
    rubricMap.set(r.id, newId);
    const { data: criteria } = await db
      .from("rubric_criteria")
      .select("criterion, description, points, position")
      .eq("rubric_id", r.id);
    if (criteria && criteria.length) {
      const { error } = await db.from("rubric_criteria").insert(
        criteria.map((c) => ({
          rubric_id: newId,
          criterion: c.criterion,
          description: c.description,
          points: c.points,
          position: c.position,
        })),
      );
      if (error) throw new Error(`clone rubric_criteria: ${error.message}`);
    }
  }

  // 3. assignments (remap group, shift due date)
  const { data: assignments } = await db
    .from("assignments")
    .select(
      "id, assignment_group_id, title, description, points_possible, due_at, unlock_at, lock_at, submission_type, accepted_file_types, allow_group_submission, published",
    )
    .eq("course_id", sourceCourseId);
  for (const a of assignments ?? []) {
    const newId = await insertReturning("assignments", {
      course_id: destCourseId,
      assignment_group_id: a.assignment_group_id ? (groupMap.get(a.assignment_group_id) ?? null) : null,
      title: a.title,
      description: a.description,
      points_possible: a.points_possible,
      due_at: shift(a.due_at),
      unlock_at: shift(a.unlock_at),
      lock_at: shift(a.lock_at),
      submission_type: a.submission_type,
      accepted_file_types: a.accepted_file_types,
      allow_group_submission: a.allow_group_submission,
      published: a.published,
    });
    assignmentMap.set(a.id, newId);
  }

  // 4. assignment_rubrics (remap both sides)
  if (assignmentMap.size && rubricMap.size) {
    const { data: ars } = await db
      .from("assignment_rubrics")
      .select("assignment_id, rubric_id")
      .in("assignment_id", [...assignmentMap.keys()]);
    const rows = (ars ?? [])
      .filter((ar) => assignmentMap.has(ar.assignment_id) && rubricMap.has(ar.rubric_id))
      .map((ar) => ({
        assignment_id: assignmentMap.get(ar.assignment_id)!,
        rubric_id: rubricMap.get(ar.rubric_id)!,
      }));
    if (rows.length) {
      const { error } = await db.from("assignment_rubrics").insert(rows);
      if (error) throw new Error(`clone assignment_rubrics: ${error.message}`);
    }
  }

  // 5. wiki_pages (includes reserved home/syllabus slugs)
  const { data: pages } = await db
    .from("wiki_pages")
    .select("id, title, slug, body_markdown, published")
    .eq("course_id", sourceCourseId);
  for (const p of pages ?? []) {
    const newId = await insertReturning("wiki_pages", {
      course_id: destCourseId,
      title: p.title,
      slug: p.slug,
      body_markdown: p.body_markdown,
      published: p.published,
      created_by: actorId,
    });
    pageMap.set(p.id, newId);
  }

  // 6. quizzes + questions + answers (remap linked assignment)
  const { data: quizzes } = await db
    .from("quizzes")
    .select("id, assignment_id, title, description, published")
    .eq("course_id", sourceCourseId);
  for (const q of quizzes ?? []) {
    const newQuizId = await insertReturning("quizzes", {
      course_id: destCourseId,
      assignment_id: q.assignment_id ? (assignmentMap.get(q.assignment_id) ?? null) : null,
      title: q.title,
      description: q.description,
      published: q.published,
    });
    quizMap.set(q.id, newQuizId);

    const { data: questions } = await db
      .from("quiz_questions")
      .select("id, question_text, question_type, points, position")
      .eq("quiz_id", q.id);
    for (const qq of questions ?? []) {
      const newQid = await insertReturning("quiz_questions", {
        quiz_id: newQuizId,
        question_text: qq.question_text,
        question_type: qq.question_type,
        points: qq.points,
        position: qq.position,
      });
      const { data: answers } = await db
        .from("quiz_answers")
        .select("answer_text, is_correct, position")
        .eq("question_id", qq.id);
      if (answers && answers.length) {
        const { error } = await db.from("quiz_answers").insert(
          answers.map((ans) => ({
            question_id: newQid,
            answer_text: ans.answer_text,
            is_correct: ans.is_correct,
            position: ans.position,
          })),
        );
        if (error) throw new Error(`clone quiz_answers: ${error.message}`);
      }
    }
  }

  // 7. modules
  const { data: modules } = await db
    .from("modules")
    .select("id, name, position, published")
    .eq("course_id", sourceCourseId);
  for (const m of modules ?? []) {
    const newId = await insertReturning("modules", {
      course_id: destCourseId,
      name: m.name,
      position: m.position,
      published: m.published,
    });
    moduleMap.set(m.id, newId);
  }

  // 8. module_items (remap module + typed reference; skip file items)
  if (moduleMap.size) {
    const { data: items } = await db
      .from("module_items")
      .select("module_id, position, item_type, title, assignment_id, page_id, quiz_id, file_id, url")
      .in("module_id", [...moduleMap.keys()]);
    const rows = [];
    for (const it of items ?? []) {
      // A file item can't be cloned (its bytes aren't copied) — drop it.
      if (it.item_type === "file") continue;
      rows.push({
        module_id: moduleMap.get(it.module_id)!,
        position: it.position,
        item_type: it.item_type,
        title: it.title,
        assignment_id: it.assignment_id ? (assignmentMap.get(it.assignment_id) ?? null) : null,
        page_id: it.page_id ? (pageMap.get(it.page_id) ?? null) : null,
        quiz_id: it.quiz_id ? (quizMap.get(it.quiz_id) ?? null) : null,
        file_id: null,
        url: it.url,
      });
    }
    if (rows.length) {
      const { error } = await db.from("module_items").insert(rows);
      if (error) throw new Error(`clone module_items: ${error.message}`);
    }
  }

  // 9. calendar_events (shift dates)
  const { data: events } = await db
    .from("calendar_events")
    .select("title, description, starts_at, ends_at, all_day")
    .eq("course_id", sourceCourseId);
  if (events && events.length) {
    const { error } = await db.from("calendar_events").insert(
      events.map((e) => ({
        course_id: destCourseId,
        title: e.title,
        description: e.description,
        starts_at: shift(e.starts_at),
        ends_at: shift(e.ends_at),
        all_day: e.all_day,
        created_by: actorId,
      })),
    );
    if (error) throw new Error(`clone calendar_events: ${error.message}`);
  }
}
