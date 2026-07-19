import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createRubric, deleteRubric } from "../actions";
import { RubricForm } from "./rubric-form";
import { ConfirmSubmitButton } from "../../ui/form-controls";

type Criterion = { id: string; criterion: string; description: string; points: number; position: number };
type Rubric = { id: string; title: string; rubric_criteria: Criterion[] };

export default async function RubricsPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/assignments");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("rubrics")
        .select("id, title, rubric_criteria(id, criterion, description, points, position)")
        .eq("course_id", course.id)
        .order("title")
    : { data: null };

  const rubrics = (data ?? []) as unknown as Rubric[];

  // Which rubrics are attached to an assignment? Those can't be deleted
  // (deleting would strip the rubric off a live assignment) — we show an
  // "In use" note instead of a Delete button.
  const rubricIds = rubrics.map((r) => r.id);
  const attached = new Set<string>();
  if (rubricIds.length > 0) {
    const { data: links } = await supabase
      .from("assignment_rubrics")
      .select("rubric_id")
      .in("rubric_id", rubricIds);
    for (const l of (links ?? []) as { rubric_id: string }[]) attached.add(l.rubric_id);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <Link href="/assignments/new" className="text-sm text-blue hover:underline">
        &larr; Back to New Assignment
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Rubrics
      </h1>
      <p className="mt-2 text-sm text-muted">
        Rubrics are reusable — create one here, then attach it to any assignment.
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        {rubrics.map((r) => {
          const criteria = [...r.rubric_criteria].sort((a, b) => a.position - b.position);
          const total = criteria.reduce((s, c) => s + c.points, 0);
          return (
            <li key={r.id} className="flex items-start justify-between gap-4 rounded-md border border-hair bg-white p-5">
              <div>
                <p className="text-sm font-medium text-text">{r.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {criteria.length} criteria &middot; {total} pts total
                </p>
              </div>
              {attached.has(r.id) ? (
                <span className="whitespace-nowrap rounded-full border border-hair px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  In use
                </span>
              ) : (
                <form action={deleteRubric.bind(null, r.id)}>
                  <ConfirmSubmitButton
                    message={`Delete the "${r.title}" rubric? This can't be undone.`}
                    pendingText="Deleting…"
                    className="whitespace-nowrap rounded-md border border-neg/40 px-3 py-1.5 text-xs font-medium text-neg transition-colors hover:bg-[#fdecea]"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              )}
            </li>
          );
        })}
        {rubrics.length === 0 && (
          <li className="text-sm text-muted">No rubrics yet.</li>
        )}
      </ul>

      <div className="mt-10 border-t border-hair pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          New Rubric
        </h2>
        <RubricForm action={createRubric} />
      </div>
    </div>
  );
}
