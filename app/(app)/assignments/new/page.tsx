import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createAssignment } from "../actions";
import { AssignmentForm } from "../assignment-form";

export default async function NewAssignmentPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/assignments");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const [{ data: groups }, { data: rubrics }] = await Promise.all([
    course
      ? supabase
          .from("assignment_groups")
          .select("id, name")
          .eq("course_id", course.id)
          .order("position")
      : Promise.resolve({ data: [] }),
    course
      ? supabase.from("rubrics").select("id, title").eq("course_id", course.id).order("title")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <Link href="/assignments" className="text-sm text-blue hover:underline">
        &larr; Back to Assignments
      </Link>

      <h1 className="mt-4 font-display text-2xl font-normal text-navy">
        New Assignment
      </h1>

      <AssignmentForm
        action={createAssignment}
        groups={groups ?? []}
        rubrics={rubrics ?? []}
        currentRubricId={null}
        submitLabel="Create Assignment"
      />
    </div>
  );
}
