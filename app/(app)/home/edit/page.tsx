import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { saveHome } from "../actions";

export default async function EditHomePage() {
  const isExec = await getIsExec();
  if (!isExec) redirect("/home");

  const course = await getCurrentCourse();
  const supabase = await createClient();
  const { data } = course
    ? await supabase
        .from("wiki_pages")
        .select("body_markdown")
        .eq("course_id", course.id)
        .eq("slug", "home")
        .maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <h1 className="font-display text-2xl font-bold text-navy-deep">
        Edit Course Front Page
      </h1>

      <form action={saveHome} className="mt-8 flex flex-col gap-5">
        <div>
          <label
            htmlFor="body_markdown"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            Front Page Content (Markdown)
          </label>
          <textarea
            id="body_markdown"
            name="body_markdown"
            rows={18}
            defaultValue={data?.body_markdown ?? ""}
            className="w-full rounded-md border border-hair bg-white px-3.5 py-2.5 font-mono text-sm text-text outline-none focus:border-blue"
            placeholder={"# Welcome to the UREC Analyst Program\n\nWhat this program is, what to expect, and where to start.\n\n## Getting Started\n\n1. Read the Syllabus\n2. Check the first Module\n3. Introduce yourself in Discussions"}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky"
          >
            Save Front Page
          </button>
          <Link
            href="/home"
            className="rounded-md border border-hair px-6 py-2.5 text-sm font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
