import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { saveSyllabus } from "../actions";

export default async function EditSyllabusPage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/syllabus");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("wiki_pages")
        .select("body_markdown")
        .eq("course_id", course.id)
        .eq("slug", "syllabus")
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Edit Syllabus
      </h1>

      <form action={saveSyllabus} className="mt-8 flex flex-col gap-5">
        <div>
          <label
            htmlFor="body_markdown"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Syllabus Content (Markdown)
          </label>
          <textarea
            id="body_markdown"
            name="body_markdown"
            rows={20}
            defaultValue={data?.body_markdown ?? ""}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
            placeholder={"## Course Overview\n\nWhat the analyst program covers…\n\n## Grading\n\n- Homework 60%\n- Case studies 25%\n- Participation 15%"}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Save Syllabus
          </button>
          <Link
            href="/syllabus"
            className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
