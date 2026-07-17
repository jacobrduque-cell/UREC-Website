import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { renderMarkdown } from "@/lib/markdown";
import Link from "next/link";

export default async function SyllabusPage() {
  const [course, isExec] = await Promise.all([getCurrentCourse(), getIsExec()]);
  const supabase = await createClient();

  const { data } = course
    ? await supabase
        .from("wiki_pages")
        .select("body_markdown")
        .eq("course_id", course.id)
        .eq("slug", "syllabus")
        .maybeSingle()
    : { data: null };

  const body = data?.body_markdown ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <div className="flex items-start justify-between gap-4 border-b border-hair pb-4">
        <h1 className="font-display text-2xl font-bold text-navy-deep">
          Course Syllabus
        </h1>
        {isExec && (
          <Link
            href="/syllabus/edit"
            className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
          >
            Edit
          </Link>
        )}
      </div>

      {body ? (
        <div
          className="rich-content mt-6 max-w-prose text-sm text-text"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
        />
      ) : (
        <p className="mt-6 text-sm text-muted">
          No syllabus posted yet.
          {isExec && " Use Edit to add one."}
        </p>
      )}
    </div>
  );
}
