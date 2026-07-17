import { createClient } from "@/lib/supabase/server";
import { getIsExec } from "@/lib/data/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { updateAssignment } from "../../actions";
import { AssignmentForm } from "../../assignment-form";

export default async function EditAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isExec = await getIsExec();
  if (!isExec) redirect(`/assignments/${id}`);

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "title, description, points_possible, due_at, submission_type, accepted_file_types, assignment_group_id, published, allow_group_submission, course_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const [{ data: groups }, { data: rubrics }, { data: rubricLink }] = await Promise.all([
    supabase
      .from("assignment_groups")
      .select("id, name")
      .eq("course_id", assignment.course_id)
      .order("position"),
    supabase.from("rubrics").select("id, title").eq("course_id", assignment.course_id).order("title"),
    supabase
      .from("assignment_rubrics")
      .select("rubric_id")
      .eq("assignment_id", id)
      .maybeSingle(),
  ]);

  const updateAction = updateAssignment.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-12">
      <Link href={`/assignments/${id}`} className="text-sm text-blue hover:underline">
        &larr; Back to {assignment.title}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-navy-deep">
        Edit Assignment
      </h1>

      <AssignmentForm
        action={updateAction}
        groups={groups ?? []}
        rubrics={rubrics ?? []}
        currentRubricId={rubricLink?.rubric_id ?? null}
        existing={assignment}
        submitLabel="Save Changes"
      />
    </div>
  );
}
