import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "../../ui/breadcrumbs";
import { WeightsForm } from "./weights-form";
import { saveWeights } from "./actions";

type GroupRow = { id: string; name: string; weight_pct: number; position: number; kind: string | null };

export default async function GradeWeightsPage() {
  const course = await getCurrentCourse();
  if (!course) redirect("/dashboard");
  if (!(await getIsExec())) redirect("/grades");

  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_groups")
    .select("id, name, weight_pct, position, kind")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  const groups = ((data ?? []) as GroupRow[]).map((g) => ({
    id: g.id,
    name: g.name,
    weight: Number(g.weight_pct),
    kind: (g.kind === "attendance" ? "attendance" : "standard") as "standard" | "attendance",
  }));

  const action = saveWeights.bind(null, course.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Breadcrumbs
        items={[
          { label: "Grades", href: "/grades" },
          { label: "Gradebook", href: "/grades/gradebook" },
          { label: "Grade weights" },
        ]}
      />
      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">Grade weights</h1>
      <p className="mt-1 text-sm text-muted">
        {course.name} — set how much each category counts toward the overall grade. Changes apply to
        every member immediately, so you can retune weights any time during the semester.
      </p>
      <WeightsForm action={action} initialGroups={groups} />
    </div>
  );
}
