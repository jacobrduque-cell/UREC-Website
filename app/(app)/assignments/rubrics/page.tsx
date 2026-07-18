import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createRubric } from "../actions";
import { RubricForm } from "./rubric-form";

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
            <li key={r.id} className="rounded-md border border-hair bg-white p-5">
              <p className="text-sm font-medium text-text">{r.title}</p>
              <p className="mt-1 text-xs text-muted">
                {criteria.length} criteria &middot; {total} pts total
              </p>
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
