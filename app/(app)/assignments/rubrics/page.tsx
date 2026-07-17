import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createRubric } from "../actions";

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
  const criterionRows = Array.from({ length: 6 });

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
        <form action={createRubric} className="mt-4 flex flex-col gap-5">
          <div>
            <label
              htmlFor="title"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Rubric Title
            </label>
            <input
              id="title"
              name="title"
              required
              className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 text-sm text-text outline-none focus:border-blue"
            />
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Criteria (leave rows blank to skip)
            </p>
            {criterionRows.map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_5rem] gap-2">
                <input
                  name={`criterion_${i}`}
                  placeholder="Criterion"
                  className="rounded-md border border-hair bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-blue"
                />
                <input
                  name={`description_${i}`}
                  placeholder="Description"
                  className="rounded-md border border-hair bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-blue"
                />
                <input
                  name={`points_${i}`}
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="Pts"
                  className="rounded-md border border-hair bg-white px-2.5 py-2 text-sm text-text outline-none focus:border-blue"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="self-start rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Create Rubric
          </button>
        </form>
      </div>
    </div>
  );
}
